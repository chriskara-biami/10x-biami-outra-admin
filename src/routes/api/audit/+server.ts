import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';

export const GET: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['audit:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const url = event.url;
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const per_page = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per_page') || '25', 10)));
	const admin_id = url.searchParams.get('admin_id');
	const org_id = url.searchParams.get('org_id');
	const action_type = url.searchParams.get('action_type');
	const from_date = url.searchParams.get('from_date');
	const to_date = url.searchParams.get('to_date');

	try {
		// Build query
		let query = serviceClient
			.from('admin_audit_log')
			.select('*', { count: 'exact' })
			.order('created_at', { ascending: false });

		if (admin_id) {
			query = query.eq('admin_user_id', admin_id);
		}
		if (org_id) {
			query = query.eq('org_id', org_id);
		}
		if (action_type) {
			query = query.eq('action_type', action_type);
		}
		if (from_date) {
			query = query.gte('created_at', from_date);
		}
		if (to_date) {
			query = query.lte('created_at', to_date);
		}

		// Apply pagination
		const offset = (page - 1) * per_page;
		query = query.range(offset, offset + per_page - 1);

		const { data, error: queryError, count } = await query;

		if (queryError) {
			throw new Error(`Failed to query audit log: ${queryError.message}`);
		}

		return json({
			entries: data || [],
			total: count || 0,
			page,
			per_page,
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Audit log query failed:`, err);
		throw error(500, 'Failed to query audit log');
	}
};
