import { createSupabaseServerClient, createServiceRoleClient } from '$lib/supabase/server';
import { type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Supabase handle — creates anon client (for admin's own auth) + service role client.
 */
const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event);
	event.locals.serviceClient = createServiceRoleClient();
	event.locals.requestId = crypto.randomUUID();

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) return { session: null, user: null };
		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

/**
 * Admin auth guard — validates admin role on every request.
 * Non-admin users get 403. Unauthenticated users get redirected to login.
 */
const adminAuthGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;
	event.locals.adminRoles = [];
	event.locals.adminSessionId = null;

	const pathname = event.url.pathname;

	// Auth routes are public
	const authRoutes = ['/login', '/logout'];
	const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

	if (isAuthRoute) {
		// Redirect authenticated admin users away from login
		if (session && user && pathname === '/login') {
			return new Response(null, {
				status: 303,
				headers: { Location: '/accounts' }
			});
		}
		return resolve(event);
	}

	// All other routes require authentication
	if (!session || !user) {
		const redirectTo = encodeURIComponent(pathname + event.url.search);
		return new Response(null, {
			status: 303,
			headers: { Location: `/login?redirect=${redirectTo}` }
		});
	}

	// Check admin_roles table using service role client
	const { data: roles, error } = await event.locals.serviceClient
		.from('admin_roles')
		.select('role')
		.eq('user_id', user.id)
		.is('revoked_at', null);

	if (error || !roles || roles.length === 0) {
		return new Response('Forbidden', { status: 403 });
	}

	event.locals.adminRoles = roles.map((r) => r.role);

	// Update last_activity_at on admin session
	const ip =
		event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		event.getClientAddress();
	const userAgent = event.request.headers.get('user-agent') || '';

	// Find or update active session
	const { data: existingSession } = await event.locals.serviceClient
		.from('admin_sessions')
		.select('id')
		.eq('user_id', user.id)
		.is('logout_at', null)
		.order('login_at', { ascending: false })
		.limit(1)
		.single();

	if (existingSession) {
		event.locals.adminSessionId = existingSession.id;
		// Fire-and-forget update
		event.locals.serviceClient
			.from('admin_sessions')
			.update({ last_activity_at: new Date().toISOString() })
			.eq('id', existingSession.id)
			.then(() => {});
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandle, adminAuthGuard);
