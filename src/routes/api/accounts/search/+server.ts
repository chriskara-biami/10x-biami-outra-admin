import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { searchAccounts } from '$lib/supabase/admin-queries';

export const GET: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['accounts:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const url = event.url;
	const q = url.searchParams.get('q');
	const field = url.searchParams.get('field') || undefined;

	if (!q || q.trim().length === 0) {
		throw error(400, 'Query parameter "q" is required');
	}

	try {
		const results = await searchAccounts(serviceClient, q.trim(), field);
		return json({ results, requestId });
	} catch (err) {
		console.error(`[${requestId}] Account search failed:`, err);
		throw error(500, 'Account search failed');
	}
};
