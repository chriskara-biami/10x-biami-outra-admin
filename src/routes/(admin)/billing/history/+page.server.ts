import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const orgId = url.searchParams.get('org_id') || undefined;

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

	return {
		entries: data || [],
		total: count || 0,
		page
	};
};
