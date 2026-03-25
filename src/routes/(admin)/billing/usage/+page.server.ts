import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const orgId = url.searchParams.get('org_id') || undefined;
	const from = url.searchParams.get('from') || undefined;
	const to = url.searchParams.get('to') || undefined;

	let usageMetrics = {
		enrichedProfiles: 0,
		connectorRuns: 0,
		apiCalls: 0,
		totalRecords: 0,
		addressMatched: 0
	};

	if (orgId) {
		// Get org members for user-scoped queries
		const { data: members } = await locals.serviceClient
			.from('organization_members')
			.select('user_id')
			.eq('org_id', orgId);

		const userIds = (members || []).map((m) => m.user_id);

		if (userIds.length > 0) {
			// Enrichment stats
			let enrichmentQuery = locals.serviceClient
				.from('user_enrichment_summary')
				.select('enriched_profiles')
				.in('user_id', userIds);

			const { data: enrichment } = await enrichmentQuery;
			usageMetrics.enrichedProfiles = (enrichment || []).reduce(
				(sum, r) => sum + (r.enriched_profiles || 0),
				0
			);

			// ETL counts
			let etlQuery = locals.serviceClient
				.from('etl_counts')
				.select('total_records, address_matched_records')
				.in('user_id', userIds);

			const { data: etlData } = await etlQuery;
			usageMetrics.totalRecords = (etlData || []).reduce(
				(sum, r) => sum + (r.total_records || 0),
				0
			);
			usageMetrics.addressMatched = (etlData || []).reduce(
				(sum, r) => sum + (r.address_matched_records || 0),
				0
			);

			// ETL status counts (connector runs)
			let statusQuery = locals.serviceClient
				.from('etl_status')
				.select('id', { count: 'exact' })
				.in('user_id', userIds);

			if (from) statusQuery = statusQuery.gte('created_at', from);
			if (to) statusQuery = statusQuery.lte('created_at', to + 'T23:59:59.999Z');

			const { count: connectorRunCount } = await statusQuery;
			usageMetrics.connectorRuns = connectorRunCount || 0;

			// Usage metrics (API calls) if table exists
			let usageQuery = locals.serviceClient
				.from('usage_metrics')
				.select('api_calls')
				.in('user_id', userIds);

			if (from) usageQuery = usageQuery.gte('created_at', from);
			if (to) usageQuery = usageQuery.lte('created_at', to + 'T23:59:59.999Z');

			const { data: usageData } = await usageQuery;
			usageMetrics.apiCalls = (usageData || []).reduce(
				(sum, r) => sum + (r.api_calls || 0),
				0
			);
		}
	}

	return {
		orgId: orgId || '',
		from: from || '',
		to: to || '',
		usageMetrics
	};
};
