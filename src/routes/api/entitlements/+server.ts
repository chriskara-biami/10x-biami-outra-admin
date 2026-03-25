import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';

export const POST: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['entitlements:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, entitlement_type, reason, expires_at } = body;

	if (!org_id || !entitlement_type || !reason) {
		throw error(400, 'Missing required fields: org_id, entitlement_type, reason');
	}

	try {
		// Insert the entitlement override
		const { data: entitlement, error: insertError } = await serviceClient
			.from('entitlements')
			.insert({
				org_id,
				entitlement_type,
				source: 'override',
				granted: true,
				reason,
				expires_at: expires_at || null,
				granted_by: user.id
			})
			.select()
			.single();

		if (insertError) {
			throw new Error(`Failed to create entitlement: ${insertError.message}`);
		}

		// Create audit entry
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'entitlement.override_created',
			action_category: 'entitlement',
			after_state: { entitlement_type, source: 'override', granted: true, expires_at },
			reason,
			request_id: requestId
		});

		// Create entitlement event
		const { error: eventError } = await serviceClient
			.from('entitlement_events')
			.insert({
				org_id,
				event_type: 'OVERRIDE_CREATED',
				metadata: {
					entitlement_type,
					granted_by: user.id,
					reason,
					expires_at
				}
			});

		if (eventError) {
			console.error(`[${requestId}] Failed to create entitlement event:`, eventError);
		}

		return json({ entitlement, requestId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Entitlement creation failed:`, err);
		throw error(500, 'Failed to create entitlement override');
	}
};
