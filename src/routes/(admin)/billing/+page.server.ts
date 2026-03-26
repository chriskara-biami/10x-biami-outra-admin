import type { PageServerLoad } from './$types';
import { listAllAccounts } from '$lib/supabase/admin-queries';
import { maskEmail } from '$lib/utils/masking';

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
		const [accountsResult, pricingResult, historyResult] = await Promise.all([
			listAllAccounts(locals.serviceClient, page, safePerPage, search, safePlan),
			locals.serviceClient
				.from('plan_pricing')
				.select('*')
				.eq('is_active', true)
				.order('created_at', { ascending: true }),
			locals.serviceClient
				.from('billing_history')
				.select('*', { count: 'exact' })
				.order('created_at', { ascending: false })
				.range(0, 99)
		]);

		// Enrich history entries with org names and emails
		const historyEntries = historyResult.data || [];
		const orgIds = [...new Set(historyEntries.map((e: any) => e.org_id).filter(Boolean))];
		const adminUserIds = [...new Set(historyEntries.map((e: any) => e.admin_user_id || e.performed_by).filter(Boolean))];

		const orgMap = new Map<string, string>();
		const orgEmailMap = new Map<string, string>();
		const adminEmailMap = new Map<string, string>();

		if (orgIds.length > 0) {
			const [orgsResult, membersResult] = await Promise.all([
				locals.serviceClient.from('organizations').select('id, name').in('id', orgIds),
				locals.serviceClient.from('organization_members').select('org_id, user_id, role').in('org_id', orgIds).eq('role', 'owner')
			]);

			for (const org of orgsResult.data || []) {
				orgMap.set(org.id, org.name);
			}

			const ownerUserIds = [...new Set((membersResult.data || []).map((m: any) => m.user_id))];
			const allUserIds = [...new Set([...ownerUserIds, ...adminUserIds])];

			if (allUserIds.length > 0) {
				const { data: usersData } = await locals.serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
				const emailByUserId = new Map<string, string>();
				for (const u of usersData?.users || []) {
					emailByUserId.set(u.id, u.email || '');
				}

				for (const m of membersResult.data || []) {
					if (m.role === 'owner' && !orgEmailMap.has(m.org_id)) {
						const email = emailByUserId.get(m.user_id);
						if (email) orgEmailMap.set(m.org_id, maskEmail(email));
					}
				}

				for (const uid of adminUserIds) {
					const email = emailByUserId.get(uid);
					if (email) adminEmailMap.set(uid, maskEmail(email));
				}
			}
		} else if (adminUserIds.length > 0) {
			const { data: usersData } = await locals.serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
			for (const u of usersData?.users || []) {
				if (adminUserIds.includes(u.id)) {
					adminEmailMap.set(u.id, maskEmail(u.email || ''));
				}
			}
		}

		const enrichedHistory = historyEntries.map((entry: any) => ({
			...entry,
			org_name: orgMap.get(entry.org_id) || null,
			owner_email: orgEmailMap.get(entry.org_id) || null,
			admin_email: adminEmailMap.get(entry.admin_user_id || entry.performed_by) || null
		}));

		return {
			accounts: accountsResult.results,
			total: accountsResult.total,
			page,
			perPage: safePerPage,
			search: search || '',
			plan: safePlan || '',
			pricing: pricingResult.data || [],
			historyEntries: enrichedHistory,
			historyTotal: historyResult.count || 0
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
			pricing: [],
			historyEntries: [],
			historyTotal: 0
		};
	}
};
