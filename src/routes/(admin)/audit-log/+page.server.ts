import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const adminId = url.searchParams.get('admin_id') || undefined;
	const orgId = url.searchParams.get('org_id') || undefined;
	const actionType = url.searchParams.get('action_type') || undefined;
	const fromDate = url.searchParams.get('from_date') || undefined;
	const toDate = url.searchParams.get('to_date') || undefined;

	const perPage = 25;
	const offset = (page - 1) * perPage;

	let query = locals.serviceClient
		.from('admin_audit_log')
		.select('*', { count: 'exact' })
		.order('created_at', { ascending: false })
		.range(offset, offset + perPage - 1);

	if (adminId) {
		query = query.eq('admin_user_id', adminId);
	}
	if (orgId) {
		query = query.eq('org_id', orgId);
	}
	if (actionType) {
		query = query.eq('action_type', actionType);
	}
	if (fromDate) {
		query = query.gte('created_at', fromDate);
	}
	if (toDate) {
		query = query.lte('created_at', toDate + 'T23:59:59.999Z');
	}

	const { data, count, error } = await query;

	if (error) {
		console.error('[AuditLog] Failed to load:', error);
	}

	return {
		entries: data || [],
		total: count || 0,
		page,
		filters: {
			admin_id: adminId || '',
			org_id: orgId || '',
			action_type: actionType || '',
			from_date: fromDate || '',
			to_date: toDate || ''
		}
	};
};
