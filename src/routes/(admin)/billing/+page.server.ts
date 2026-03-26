import type { PageServerLoad } from './$types';
import { listAllAccounts } from '$lib/supabase/admin-queries';

export const load: PageServerLoad = async ({ url, locals }) => {
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const perPage = parseInt(url.searchParams.get('perPage') || '10', 10);
	const search = url.searchParams.get('q') || undefined;
	const plan = url.searchParams.get('plan') || undefined;

	// Clamp perPage to allowed values
	const allowedPerPage = [10, 20, 50];
	const safePerPage = allowedPerPage.includes(perPage) ? perPage : 10;

	// Validate plan filter
	const allowedPlans = ['free', 'founder'];
	const safePlan = plan && allowedPlans.includes(plan) ? plan : undefined;

	try {
		const [accountsResult, pricingResult] = await Promise.all([
			listAllAccounts(locals.serviceClient, page, safePerPage, search, safePlan),
			locals.serviceClient
				.from('plan_pricing')
				.select('*')
				.eq('is_active', true)
				.order('created_at', { ascending: true })
		]);

		return {
			accounts: accountsResult.results,
			total: accountsResult.total,
			page,
			perPage: safePerPage,
			search: search || '',
			plan: safePlan || '',
			pricing: pricingResult.data || []
		};
	} catch (err) {
		console.error('[Billing] Failed to load:', err);
		return {
			accounts: [],
			total: 0,
			page: 1,
			perPage: safePerPage,
			search: search || '',
			plan: safePlan || '',
			pricing: []
		};
	}
};
