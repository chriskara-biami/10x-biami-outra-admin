import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';

export const POST: RequestHandler = async (event) => {
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

		if (org.plan_status !== 'paused') {
			throw error(400, 'Organization is not currently paused');
		}

		const beforeState = { plan: org.plan, plan_status: org.plan_status };

		// Set plan_status to active
		const { error: updateError } = await serviceClient
			.from('organizations')
			.update({ plan_status: 'active' })
			.eq('id', org_id);

		if (updateError) {
			throw new Error(`Failed to resume subscription: ${updateError.message}`);
		}

		// Restore entitlements from the latest pause billing_history snapshot
		const { data: pauseHistory, error: historyFetchError } = await serviceClient
			.from('billing_history')
			.select('metadata')
			.eq('org_id', org_id)
			.eq('action', 'subscription_paused')
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (!historyFetchError && pauseHistory?.metadata?.entitlement_snapshot) {
			const snapshot = pauseHistory.metadata.entitlement_snapshot as Record<string, boolean>;

			for (const [entitlement_type, wasGranted] of Object.entries(snapshot)) {
				if (wasGranted) {
					const { error: restoreError } = await serviceClient
						.from('entitlements')
						.update({ granted: true })
						.eq('org_id', org_id)
						.eq('source', 'plan')
						.eq('entitlement_type', entitlement_type);

					if (restoreError) {
						console.error(
							`[${requestId}] Failed to restore entitlement ${entitlement_type}:`,
							restoreError
						);
					}
				}
			}
		}

		// Insert billing history record
		const { error: historyError } = await serviceClient
			.from('billing_history')
			.insert({
				org_id,
				action: 'subscription_resumed',
				from_plan: org.plan,
				to_plan: org.plan,
				reason,
				performed_by: user.id
			});

		if (historyError) {
			console.error(`[${requestId}] Failed to insert billing history:`, historyError);
		}

		// Create audit entry
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'billing.subscription_resumed',
			action_category: 'billing',
			before_state: beforeState,
			after_state: { plan: org.plan, plan_status: 'active' },
			reason,
			request_id: requestId
		});

		return json({
			success: true,
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Subscription resume failed:`, err);
		throw error(500, 'Failed to resume subscription');
	}
};
