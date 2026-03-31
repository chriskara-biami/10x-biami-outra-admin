import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';
import { generateTxId } from '$lib/utils/tx-id';

export const POST: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, pause_type, reason } = body;

	if (!org_id || !pause_type || !reason) {
		throw error(400, 'Missing required fields: org_id, pause_type, reason');
	}

	if (!['billing_only', 'full'].includes(pause_type)) {
		throw error(400, 'Invalid pause_type. Must be "billing_only" or "full"');
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

		// Set plan_status to paused
		const { error: updateError } = await serviceClient
			.from('organizations')
			.update({ plan_status: 'paused' })
			.eq('id', org_id);

		if (updateError) {
			throw new Error(`Failed to pause subscription: ${updateError.message}`);
		}

		let entitlementSnapshot: Record<string, boolean> | null = null;

		// If full pause, disable plan entitlements and save snapshot
		if (pause_type === 'full') {
			// Get current entitlement states for snapshot
			const { data: currentEntitlements } = await serviceClient
				.from('entitlements')
				.select('entitlement_type, granted')
				.eq('org_id', org_id)
				.eq('source', 'plan');

			if (currentEntitlements) {
				entitlementSnapshot = {};
				for (const e of currentEntitlements) {
					entitlementSnapshot[e.entitlement_type] = e.granted;
				}
			}

			// Set plan entitlements granted=false
			const { error: entitlementError } = await serviceClient
				.from('entitlements')
				.update({ granted: false })
				.eq('org_id', org_id)
				.eq('source', 'plan');

			if (entitlementError) {
				console.error(`[${requestId}] Failed to pause entitlements:`, entitlementError);
			}
		}

		// Fetch pricing for the paused plan
		const { data: pricing } = await serviceClient
			.from('plan_pricing')
			.select('monthly_price_pence')
			.eq('plan_key', org.plan)
			.eq('is_active', true)
			.single();

		const txId = generateTxId(
			user.email || '',
			org.plan,
			pricing?.monthly_price_pence ?? null
		);

		// Insert billing history with snapshot in metadata
		const { error: historyError } = await serviceClient
			.from('billing_history')
			.insert({
				org_id,
				action: 'subscription_paused',
				from_plan: org.plan,
				to_plan: org.plan,
				reason,
				performed_by: user.id,
				stripe_transaction_id: txId,
				metadata: {
					pause_type,
					entitlement_snapshot: entitlementSnapshot
				}
			});

		if (historyError) {
			console.error(`[${requestId}] Failed to insert billing history:`, historyError);
		}

		// Create audit entry
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'billing.subscription_paused',
			action_category: 'billing',
			before_state: beforeState,
			after_state: { plan: org.plan, plan_status: 'paused', pause_type },
			reason,
			request_id: requestId
		});

		return json({
			success: true,
			pause_type,
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Subscription pause failed:`, err);
		throw error(500, 'Failed to pause subscription');
	}
};
