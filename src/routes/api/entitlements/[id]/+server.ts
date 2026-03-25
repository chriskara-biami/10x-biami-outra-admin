import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';
import { purgeOrgData } from '$lib/services/purge';

export const DELETE: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['entitlements:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const entitlementId = event.params.id;
	const body = await event.request.json();
	const { reason } = body;

	if (!reason) {
		throw error(400, 'Missing required field: reason');
	}

	try {
		// Fetch current entitlement for before_state
		const { data: current, error: fetchError } = await serviceClient
			.from('entitlements')
			.select('*')
			.eq('id', entitlementId)
			.single();

		if (fetchError || !current) {
			throw error(404, 'Entitlement not found');
		}

		// Update entitlement to revoked
		const { error: updateError } = await serviceClient
			.from('entitlements')
			.update({ granted: false })
			.eq('id', entitlementId);

		if (updateError) {
			throw new Error(`Failed to revoke entitlement: ${updateError.message}`);
		}

		// Create audit entry
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id: current.org_id,
			action_type: 'entitlement.override_revoked',
			action_category: 'entitlement',
			before_state: { granted: true, entitlement_type: current.entitlement_type },
			after_state: { granted: false, entitlement_type: current.entitlement_type },
			reason,
			request_id: requestId
		});

		// Create entitlement event
		const { error: eventError } = await serviceClient
			.from('entitlement_events')
			.insert({
				org_id: current.org_id,
				event_type: 'REVOKED',
				metadata: {
					entitlement_id: entitlementId,
					entitlement_type: current.entitlement_type,
					revoked_by: user.id,
					reason
				}
			});

		if (eventError) {
			console.error(`[${requestId}] Failed to create entitlement event:`, eventError);
		}

		// Purge org data
		const purgeResult = await purgeOrgData(serviceClient, current.org_id);

		return json({
			success: true,
			purge: purgeResult,
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Entitlement revocation failed:`, err);
		throw error(500, 'Failed to revoke entitlement');
	}
};
