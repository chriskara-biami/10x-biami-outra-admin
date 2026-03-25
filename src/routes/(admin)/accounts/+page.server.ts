import type { PageServerLoad } from './$types';
import { listAllAccounts } from '$lib/supabase/admin-queries';

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q') || undefined;
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
	const perPage = parseInt(url.searchParams.get('perPage') || '10', 10);
	const plan = url.searchParams.get('plan') || undefined;

	const allowedPerPage = [10, 20, 50];
	const safePerPage = allowedPerPage.includes(perPage) ? perPage : 10;

	const allowedPlans = ['free', 'founder'];
	const safePlan = plan && allowedPlans.includes(plan) ? plan : undefined;

	try {
		const { results, total } = await listAllAccounts(locals.serviceClient, page, safePerPage, q, safePlan);
		console.log(`[Accounts] Loaded ${results.length} of ${total} accounts (page ${page})`);
		return {
			query: q || '',
			page,
			perPage: safePerPage,
			plan: safePlan || '',
			total,
			totalPages: Math.ceil(total / safePerPage),
			results
		};
	} catch (err) {
		console.error('[Accounts] Error loading accounts:', err);
		return {
			query: q || '',
			page,
			perPage: safePerPage,
			plan: safePlan || '',
			total: 0,
			totalPages: 0,
			results: []
		};
	}
};
