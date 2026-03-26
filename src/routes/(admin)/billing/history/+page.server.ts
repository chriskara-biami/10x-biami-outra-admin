import type { PageServerLoad } from './$types';
import { maskEmail } from '$lib/utils/masking';

export const load: PageServerLoad = async ({ url, locals }) => {
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const orgId = url.searchParams.get('org_id') || undefined;
	const search = url.searchParams.get('q') || undefined;

	const perPage = 25;
	const offset = (page - 1) * perPage;

	let query = locals.serviceClient
		.from('billing_history')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + perPage - 1);

	if (orgId) {
		query = query.eq('org_id', orgId);
	}

	const { data, count, error } = await query;

	if (error) {
		console.error('[BillingHistory] Failed to load:', error);
	}

	const entries = data || [];

	// Enrich entries with org name and user email
	const orgIds = [...new Set(entries.map((e) => e.org_id).filter(Boolean))];
	const adminUserIds = [...new Set(entries.map((e) => e.admin_user_id || e.performed_by).filter(Boolean))];

	// Batch-fetch org names
	const orgMap = new Map<string, string>();
	if (orgIds.length > 0) {
		const { data: orgs } = await locals.serviceClient
			.from('organizations')
			.select('id, name')
			.in('id', orgIds);

		for (const org of orgs || []) {
			orgMap.set(org.id, org.name);
		}
	}

	// Batch-fetch owner emails per org
	const orgEmailMap = new Map<string, string>();
	if (orgIds.length > 0) {
		const { data: members } = await locals.serviceClient
			.from('organization_members')
			.select('org_id, user_id, role')
			.in('org_id', orgIds)
			.eq('role', 'owner');

		const ownerUserIds = [...new Set((members || []).map((m) => m.user_id))];

		if (ownerUserIds.length > 0) {
			const { data: usersData } = await locals.serviceClient.auth.admin.listUsers({
				page: 1,
				perPage: 1000
			});

			const emailByUserId = new Map<string, string>();
			for (const u of usersData?.users || []) {
				emailByUserId.set(u.id, u.email || '');
			}

			for (const m of members || []) {
				if (m.role === 'owner' && !orgEmailMap.has(m.org_id)) {
					const email = emailByUserId.get(m.user_id);
					if (email) orgEmailMap.set(m.org_id, maskEmail(email));
				}
			}
		}
	}

	// Fetch admin user emails for "performed by"
	const adminEmailMap = new Map<string, string>();
	if (adminUserIds.length > 0) {
		const { data: usersData } = await locals.serviceClient.auth.admin.listUsers({
			page: 1,
			perPage: 1000
		});

		for (const u of usersData?.users || []) {
			if (adminUserIds.includes(u.id)) {
				adminEmailMap.set(u.id, maskEmail(u.email || ''));
			}
		}
	}

	let enrichedEntries = entries.map((entry) => ({
		...entry,
		org_name: orgMap.get(entry.org_id) || null,
		owner_email: orgEmailMap.get(entry.org_id) || null,
		admin_email: adminEmailMap.get(entry.admin_user_id || entry.performed_by) || null
	}));

	// Client-side search filtering (across org name, email, org ID)
	if (search) {
		const q = search.toLowerCase();
		enrichedEntries = enrichedEntries.filter((entry) => {
			return (
				(entry.org_name && entry.org_name.toLowerCase().includes(q)) ||
				(entry.owner_email && entry.owner_email.toLowerCase().includes(q)) ||
				(entry.org_id && entry.org_id.toLowerCase().includes(q)) ||
				(entry.stripe_transaction_id && entry.stripe_transaction_id.toLowerCase().includes(q))
			);
		});
	}

	return {
		entries: enrichedEntries,
		total: search ? enrichedEntries.length : (count || 0),
		page,
		search: search || ''
	};
};
