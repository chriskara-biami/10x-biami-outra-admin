import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all user IDs belonging to an organization.
 */
async function getOrgMemberIds(
	serviceClient: SupabaseClient,
	orgId: string
): Promise<string[]> {
	const { data, error } = await serviceClient
		.from('organization_members')
		.select('user_id')
		.eq('org_id', orgId);

	if (error) throw new Error(`Failed to fetch org members: ${error.message}`);
	return (data || []).map((m) => m.user_id);
}

/**
 * Purge all enrichment data for an organization.
 * Called when entitlement is revoked or subscription cancelled.
 */
export async function purgeOrgData(
	serviceClient: SupabaseClient,
	orgId: string
): Promise<{ deletedTables: string[]; errors: string[] }> {
	const memberIds = await getOrgMemberIds(serviceClient, orgId);
	const deletedTables: string[] = [];
	const errors: string[] = [];

	if (memberIds.length === 0) {
		return { deletedTables, errors };
	}

	// Tables to purge
	const tables = [
		'user_enrichment_summary',
		'user_enrichment_attributes',
		'user_audience_summary'
	];

	for (const table of tables) {
		const { error } = await serviceClient
			.from(table)
			.delete()
			.in('user_id', memberIds);

		if (error) {
			errors.push(`${table}: ${error.message}`);
		} else {
			deletedTables.push(table);
		}
	}

	// Cancel active Census syncs
	const { error: syncError } = await serviceClient
		.from('census_syncs')
		.update({ status: 'cancelled' })
		.in('user_id', memberIds)
		.eq('status', 'working');

	if (syncError) {
		errors.push(`census_syncs: ${syncError.message}`);
	}

	// Log purge event
	await serviceClient.from('entitlement_events').insert({
		org_id: orgId,
		event_type: 'PURGE_INITIATED',
		metadata: { deleted_tables: deletedTables, member_count: memberIds.length }
	});

	return { deletedTables, errors };
}
