import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		redirect(303, '/accounts');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		const { data, error: authError } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (authError) {
			return fail(401, { error: 'Invalid credentials' });
		}

		if (!data.user) {
			return fail(401, { error: 'Login failed' });
		}

		// Verify admin role
		const { data: roles, error: roleError } = await locals.serviceClient
			.from('admin_roles')
			.select('role')
			.eq('user_id', data.user.id)
			.is('revoked_at', null);

		if (roleError || !roles || roles.length === 0) {
			await locals.supabase.auth.signOut();
			return fail(403, { error: 'You do not have admin access' });
		}

		// Create admin session record
		const ip =
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
		const userAgent = request.headers.get('user-agent') || '';

		await locals.serviceClient.from('admin_sessions').insert({
			user_id: data.user.id,
			ip_address: ip,
			user_agent: userAgent
		});

		redirect(303, '/accounts');
	}
};
