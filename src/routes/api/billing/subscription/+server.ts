import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';
import { purgeOrgData } from '$lib/services/purge';

export const DELETE: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, reason } = body;

	if (!org_id || !reason) {
		throw error(400, 'Missing required fields: org_id, reason');
	}

	try {
		// Fetch current org for before_state
		const { data: org, error: orgError } = await serviceClient
			.from('organizations')
			.select('*')
			.eq('id', org_id)
			.single();

		if (orgError || !org) {
			throw error(404, 'Organization not found');
		}

		const beforeState = { plan: org.plan, plan_status: org.plan_status };

		// Set plan_status to cancelled
		const { error: updateError } = await serviceClient
			.from('organizations')
			.update({ plan_status: 'cancelled' })
			.eq('id', org_id);

		if (updateError) {
			throw new Error(`Failed to cancel subscription: ${updateError.message}`);
		}

		// Set all plan entitlements granted=false
		const { error: entitlementError } = await serviceClient
			.from('entitlements')
			.update({ granted: false })
			.eq('org_id', org_id)
			.eq('source', 'plan');

		if (entitlementError) {
			console.error(`[${requestId}] Failed to revoke plan entitlements:`, entitlementError);
		}

		// Create entitlement events for each revoked entitlement
		const { data: revokedEntitlements } = await serviceClient
			.from('entitlements')
			.select('entitlement_type')
			.eq('org_id', org_id)
			.eq('source', 'plan');

		if (revokedEntitlements && revokedEntitlements.length > 0) {
			const events = revokedEntitlements.map((e) => ({
				org_id,
				event_type: 'PLAN_CANCELLED',
				metadata: {
					entitlement_type: e.entitlement_type,
					cancelled_by: user.id,
					reason
				}
			}));

			const { error: eventError } = await serviceClient
				.from('entitlement_events')
				.insert(events);

			if (eventError) {
				console.error(`[${requestId}] Failed to create entitlement events:`, eventError);
			}
		}

		// Purge org data
		const purgeResult = await purgeOrgData(serviceClient, org_id);

		// Create audit entry
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'billing.subscription_cancelled',
			action_category: 'billing',
			before_state: beforeState,
			after_state: { plan: org.plan, plan_status: 'cancelled' },
			reason,
			request_id: requestId
		});

		// Insert billing history record
		const { error: historyError } = await serviceClient
			.from('billing_history')
			.insert({
				org_id,
				action: 'subscription_cancelled',
				from_plan: org.plan,
				to_plan: null,
				reason,
				performed_by: user.id
			});

		if (historyError) {
			console.error(`[${requestId}] Failed to insert billing history:`, historyError);
		}

		return json({
			success: true,
			purge: purgeResult,
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Subscription cancellation failed:`, err);
		throw error(500, 'Failed to cancel subscription');
	}
};
