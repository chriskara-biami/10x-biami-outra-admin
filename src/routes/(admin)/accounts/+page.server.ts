import type { PageServerLoad } from './$types';
import { listAllAccounts } from '$lib/supabase/admin-queries';

const PER_PAGE = 30;

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q') || undefined;
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));

	try {
		const { results, total } = await listAllAccounts(locals.serviceClient, page, PER_PAGE, q);
		console.log(`[Accounts] Loaded ${results.length} of ${total} accounts (page ${page})`);
		return {
			query: q || '',
			page,
			perPage: PER_PAGE,
			total,
			totalPages: Math.ceil(total / PER_PAGE),
			results
		};
	} catch (err) {
		console.error('[Accounts] Error loading accounts:', err);
		return {
			query: q || '',
			page,
			perPage: PER_PAGE,
			total: 0,
			totalPages: 0,
			results: []
		};
	}
};
