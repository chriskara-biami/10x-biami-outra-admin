import type { SupabaseClient } from '@supabase/supabase-js';
import { maskEmail, maskBillingId } from '$lib/utils/masking';

/**
 * Cross-tenant query functions for admin use.
 * All functions require a service role client.
 */

export async function getOrgData(serviceClient: SupabaseClient, orgId: string) {
	const { data, error } = await serviceClient
		.from('organizations')
		.select('*')
		.eq('id', orgId)
		.single();

	if (error) throw new Error(`Failed to fetch org: ${error.message}`);
	return data;
}

export async function getOrgMembers(serviceClient: SupabaseClient, orgId: string) {
	const { data: members, error } = await serviceClient
		.from('organization_members')
		.select('user_id, role, created_at')
		.eq('org_id', orgId);

	if (error) throw new Error(`Failed to fetch members: ${error.message}`);

	// Fetch user details for each member
	const enriched = await Promise.all(
		(members || []).map(async (member) => {
			const { data: userData } = await serviceClient.auth.admin.getUserById(member.user_id);
			return {
				...member,
				email: userData?.user?.email ? maskEmail(userData.user.email) : null,
				first_name: userData?.user?.user_metadata?.first_name || null,
				last_name: userData?.user?.user_metadata?.last_name || null,
				last_sign_in_at: userData?.user?.last_sign_in_at || null
			};
		})
	);

	return enriched;
}

export async function getOrgConnections(serviceClient: SupabaseClient, orgId: string) {
	// Get member user_ids for this org
	const { data: members } = await serviceClient
		.from('organization_members')
		.select('user_id')
		.eq('org_id', orgId);

	if (!members || members.length === 0) return [];

	const userIds = members.map((m) => m.user_id);
	const { data, error } = await serviceClient
		.from('fivetran_connectors')
		.select('*')
		.in('user_id', userIds);

	if (error) throw new Error(`Failed to fetch connections: ${error.message}`);
	return data || [];
}

export async function getOrgDestinations(serviceClient: SupabaseClient, orgId: string) {
	const { data: members } = await serviceClient
		.from('organization_members')
		.select('user_id')
		.eq('org_id', orgId);

	if (!members || members.length === 0) return [];

	const userIds = members.map((m) => m.user_id);
	const { data, error } = await serviceClient
		.from('census_destinations')
		.select('*')
		.in('user_id', userIds);

	if (error) throw new Error(`Failed to fetch destinations: ${error.message}`);
	return data || [];
}

export async function getOrgEntitlements(serviceClient: SupabaseClient, orgId: string) {
	const { data, error } = await serviceClient
		.from('entitlements')
		.select('*')
		.eq('org_id', orgId)
		.order('created_at', { ascending: false });

	if (error) throw new Error(`Failed to fetch entitlements: ${error.message}`);
	return data || [];
}

export async function getOrgEnrichmentStats(serviceClient: SupabaseClient, orgId: string) {
	const { data: members } = await serviceClient
		.from('organization_members')
		.select('user_id')
		.eq('org_id', orgId);

	if (!members || members.length === 0) {
		return { totalRecords: 0, addressMatched: 0, enrichedProfiles: 0 };
	}

	const userIds = members.map((m) => m.user_id);

	const [etlCounts, enrichment] = await Promise.all([
		serviceClient
			.from('etl_counts')
			.select('total_records, address_matched_records')
			.in('user_id', userIds),
		serviceClient
			.from('user_enrichment_summary')
			.select('enriched_profiles')
			.in('user_id', userIds)
	]);

	const totalRecords = (etlCounts.data || []).reduce((sum, r) => sum + (r.total_records || 0), 0);
	const addressMatched = (etlCounts.data || []).reduce(
		(sum, r) => sum + (r.address_matched_records || 0),
		0
	);
	const enrichedProfiles = (enrichment.data || []).reduce(
		(sum, r) => sum + (r.enriched_profiles || 0),
		0
	);

	return { totalRecords, addressMatched, enrichedProfiles };
}

export async function getOrgAuditLog(
	serviceClient: SupabaseClient,
	orgId: string,
	limit = 10
) {
	const { data, error } = await serviceClient
		.from('admin_audit_log')
		.select('*')
		.eq('org_id', orgId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) throw new Error(`Failed to fetch audit log: ${error.message}`);
	return data || [];
}

export type AccountResult = {
	org_id: string;
	org_name: string;
	billing_id: string | null;
	plan: string;
	plan_status: string;
	email: string | null;
	connection_status: string | null;
	has_activation: boolean;
	has_override: boolean;
	created_at: string;
};

/**
 * List all accounts with pagination. Always returns results.
 * Uses batch queries instead of N+1 for performance.
 */
export async function listAllAccounts(
	serviceClient: SupabaseClient,
	page: number = 1,
	perPage: number = 30,
	query?: string
): Promise<{ results: AccountResult[]; total: number }> {
	// 1. Fetch paginated orgs
	let orgQuery = serviceClient
		.from('organizations')
		.select('id, name, billing_id, plan, plan_status, created_at', { count: 'exact' });

	if (query) {
		orgQuery = orgQuery.ilike('name', `%${query}%`);
	}

	const from = (page - 1) * perPage;
	const to = from + perPage - 1;

	const { data: orgs, count, error } = await orgQuery
		.order('created_at', { ascending: false })
		.range(from, to);

	if (error) throw new Error(`Failed to fetch organizations: ${error.message}`);
	if (!orgs || orgs.length === 0) return { results: [], total: count || 0 };

	const orgIds = orgs.map((o) => o.id);

	// 2. Batch-fetch all related data in parallel (3 queries instead of N*3)
	const [membersResult, entitlementsResult] = await Promise.all([
		serviceClient
			.from('organization_members')
			.select('org_id, user_id, role')
			.in('org_id', orgIds)
			.eq('role', 'owner'),
		serviceClient
			.from('entitlements')
			.select('org_id, entitlement_type, source, granted')
			.in('org_id', orgIds)
			.eq('granted', true)
	]);

	const members = membersResult.data || [];
	const entitlements = entitlementsResult.data || [];

	// Build lookup maps
	const ownerByOrg = new Map<string, string>();
	const ownerUserIds: string[] = [];
	for (const m of members) {
		if (!ownerByOrg.has(m.org_id)) {
			ownerByOrg.set(m.org_id, m.user_id);
			ownerUserIds.push(m.user_id);
		}
	}

	// 3. Batch-fetch user emails + connector status for all owners
	const [usersResult, connectorsResult] = await Promise.all([
		ownerUserIds.length > 0
			? serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
			: Promise.resolve({ data: { users: [] } }),
		ownerUserIds.length > 0
			? serviceClient
					.from('fivetran_connectors')
					.select('user_id, setup_state')
					.in('user_id', ownerUserIds)
			: Promise.resolve({ data: [] })
	]);

	// Build user email map
	const emailByUserId = new Map<string, string>();
	for (const u of usersResult.data?.users || []) {
		emailByUserId.set(u.id, u.email || '');
	}

	// Build connector status map (first connector per user)
	const connectorByUserId = new Map<string, string>();
	for (const c of (connectorsResult as { data: Array<{ user_id: string; setup_state: string }> | null }).data || []) {
		if (!connectorByUserId.has(c.user_id)) {
			connectorByUserId.set(c.user_id, c.setup_state);
		}
	}

	// 4. Assemble results
	const results: AccountResult[] = orgs.map((org) => {
		const ownerId = ownerByOrg.get(org.id);
		const email = ownerId ? emailByUserId.get(ownerId) || null : null;
		const connectionStatus = ownerId ? connectorByUserId.get(ownerId) || null : null;

		const orgEntitlements = entitlements.filter((e) => e.org_id === org.id);
		const hasActivation = orgEntitlements.some((e) => e.entitlement_type === 'activation');
		const hasOverride = orgEntitlements.some((e) => e.source === 'override');

		return {
			org_id: org.id,
			org_name: org.name,
			billing_id: org.billing_id ? maskBillingId(org.billing_id) : null,
			plan: org.plan,
			plan_status: org.plan_status,
			email,
			connection_status: connectionStatus,
			has_activation: hasActivation,
			has_override: hasOverride,
			created_at: org.created_at
		};
	});

	return { results, total: count || 0 };
}

export async function searchAccounts(
	serviceClient: SupabaseClient,
	query: string,
	field?: string
) {
	type AccountResult = {
		org_id: string;
		org_name: string;
		billing_id: string | null;
		plan: string;
		plan_status: string;
		email: string | null;
		connection_status: string | null;
		has_activation: boolean;
		has_override: boolean;
	};

	const results: AccountResult[] = [];
	const seen = new Set<string>();

	// Search by org name
	if (!field || field === 'org_name') {
		const { data: orgs } = await serviceClient
			.from('organizations')
			.select('id, name, billing_id, plan, plan_status')
			.ilike('name', `%${query}%`)
			.limit(20);

		for (const org of orgs || []) {
			if (seen.has(org.id)) continue;
			seen.add(org.id);
			results.push({
				org_id: org.id,
				org_name: org.name,
				billing_id: org.billing_id ? maskBillingId(org.billing_id) : null,
				plan: org.plan,
				plan_status: org.plan_status,
				email: null,
				connection_status: null,
				has_activation: false,
				has_override: false
			});
		}
	}

	// Search by email
	if (!field || field === 'email') {
		const { data: users } = await serviceClient.auth.admin.listUsers({
			page: 1,
			perPage: 20
		});

		const matchingUsers = (users?.users || []).filter((u) =>
			u.email?.toLowerCase().includes(query.toLowerCase())
		);

		for (const user of matchingUsers) {
			const { data: membership } = await serviceClient
				.from('organization_members')
				.select('org_id')
				.eq('user_id', user.id)
				.limit(1)
				.single();

			if (membership && !seen.has(membership.org_id)) {
				seen.add(membership.org_id);
				const { data: org } = await serviceClient
					.from('organizations')
					.select('*')
					.eq('id', membership.org_id)
					.single();

				if (org) {
					results.push({
						org_id: org.id,
						org_name: org.name,
						billing_id: org.billing_id ? maskBillingId(org.billing_id) : null,
						plan: org.plan,
						plan_status: org.plan_status,
						email: maskEmail(user.email || ''),
						connection_status: null,
						has_activation: false,
						has_override: false
					});
				}
			}
		}
	}

	// Search by org ID
	if (!field || field === 'org_id') {
		const { data: org } = await serviceClient
			.from('organizations')
			.select('*')
			.eq('id', query)
			.single();

		if (org && !seen.has(org.id)) {
			seen.add(org.id);
			results.push({
				org_id: org.id,
				org_name: org.name,
				billing_id: org.billing_id ? maskBillingId(org.billing_id) : null,
				plan: org.plan,
				plan_status: org.plan_status,
				email: null,
				connection_status: null,
				has_activation: false,
				has_override: false
			});
		}
	}

	// Enrich results with entitlement info
	for (const result of results) {
		const { data: entitlements } = await serviceClient
			.from('entitlements')
			.select('entitlement_type, source, granted')
			.eq('org_id', result.org_id)
			.eq('granted', true);

		if (entitlements) {
			result.has_activation = entitlements.some((e) => e.entitlement_type === 'activation');
			result.has_override = entitlements.some(
				(e) => e.source === 'override' && e.granted
			);
		}

		// Get connection status
		const { data: members } = await serviceClient
			.from('organization_members')
			.select('user_id')
			.eq('org_id', result.org_id);

		if (members && members.length > 0) {
			const { data: connectors } = await serviceClient
				.from('fivetran_connectors')
				.select('setup_state')
				.in(
					'user_id',
					members.map((m) => m.user_id)
				)
				.limit(1);

			if (connectors && connectors.length > 0) {
				result.connection_status = connectors[0].setup_state;
			}
		}
	}

	return results;
}
