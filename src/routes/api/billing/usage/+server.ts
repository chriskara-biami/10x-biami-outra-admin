import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';

export const GET: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const url = event.url;
	const org_id = url.searchParams.get('org_id');
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	if (!org_id) {
		throw error(400, 'Missing required query parameter: org_id');
	}

	try {
		// Get org members
		const { data: members } = await serviceClient
			.from('organization_members')
			.select('user_id')
			.eq('org_id', org_id);

		if (!members || members.length === 0) {
			return json({ usage: [], enrichment: { totalRecords: 0, addressMatched: 0, enrichedProfiles: 0 }, requestId });
		}

		const userIds = members.map((m) => m.user_id);

		// Query usage_metrics with optional date range
		let usageQuery = serviceClient
			.from('usage_metrics')
			.select('*')
			.in('user_id', userIds)
			.order('created_at', { ascending: false });

		if (from) {
			usageQuery = usageQuery.gte('created_at', from);
		}
		if (to) {
			usageQuery = usageQuery.lte('created_at', to);
		}

		const { data: usage, error: usageError } = await usageQuery;

		if (usageError) {
			throw new Error(`Failed to fetch usage metrics: ${usageError.message}`);
		}

		// Aggregate enrichment stats
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

		const totalRecords = (etlCounts.data || []).reduce(
			(sum, r) => sum + (r.total_records || 0),
			0
		);
		const addressMatched = (etlCounts.data || []).reduce(
			(sum, r) => sum + (r.address_matched_records || 0),
			0
		);
		const enrichedProfiles = (enrichment.data || []).reduce(
			(sum, r) => sum + (r.enriched_profiles || 0),
			0
		);

		return json({
			usage: usage || [],
			enrichment: { totalRecords, addressMatched, enrichedProfiles },
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Usage query failed:`, err);
		throw error(500, 'Failed to fetch usage data');
	}
};
