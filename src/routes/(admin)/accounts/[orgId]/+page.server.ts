import type { PageServerLoad } from './$types';
import {
	getOrgData,
	getOrgMembers,
	getOrgConnections,
	getOrgDestinations,
	getOrgEntitlements,
	getOrgEnrichmentStats,
	getOrgAuditLog
} from '$lib/supabase/admin-queries';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { orgId } = params;

	const [org, members, connections, destinations, entitlements, enrichmentStats, auditLog] =
		await Promise.all([
			getOrgData(locals.serviceClient, orgId),
			getOrgMembers(locals.serviceClient, orgId),
			getOrgConnections(locals.serviceClient, orgId),
			getOrgDestinations(locals.serviceClient, orgId),
			getOrgEntitlements(locals.serviceClient, orgId),
			getOrgEnrichmentStats(locals.serviceClient, orgId),
			getOrgAuditLog(locals.serviceClient, orgId)
		]);

	return {
		org,
		members,
		connections,
		destinations,
		entitlements,
		enrichmentStats,
		auditLog
	};
};
