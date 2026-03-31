import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';
import { PLAN_ENTITLEMENTS } from '$lib/config/plan-entitlements';
import { generateTxId } from '$lib/utils/tx-id';

export const POST: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:mutate'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, new_plan, effective_date, reason } = body;

	if (!org_id || !new_plan || !reason) {
		throw error(400, 'Missing required fields: org_id, new_plan, reason');
	}

	if (!PLAN_ENTITLEMENTS[new_plan]) {
		throw error(400, `Invalid plan: ${new_plan}`);
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

		const beforeState = { plan: org.plan, plan_started_at: org.plan_started_at };
		const planStartedAt = effective_date || new Date().toISOString();

		// Update organization plan
		const { error: updateError } = await serviceClient
			.from('organizations')
			.update({ plan: new_plan, plan_started_at: planStartedAt })
			.eq('id', org_id);

		if (updateError) {
			throw new Error(`Failed to update plan: ${updateError.message}`);
		}

		// Delete old plan entitlements
		const { error: deleteError } = await serviceClient
			.from('entitlements')
			.delete()
			.eq('org_id', org_id)
			.eq('source', 'plan');

		if (deleteError) {
			console.error(`[${requestId}] Failed to delete old entitlements:`, deleteError);
		}

		// Insert new plan entitlements
		const newEntitlements = PLAN_ENTITLEMENTS[new_plan].map((entitlement_type) => ({
			org_id,
			entitlement_type,
			source: 'plan',
			granted: true,
			granted_by: user.id
		}));

		if (newEntitlements.length > 0) {
			const { error: insertError } = await serviceClient
				.from('entitlements')
				.insert(newEntitlements);

			if (insertError) {
				console.error(`[${requestId}] Failed to insert new entitlements:`, insertError);
			}
		}

		// Fetch pricing for the new plan
		const { data: pricing } = await serviceClient
			.from('plan_pricing')
			.select('monthly_price_pence')
			.eq('plan_key', new_plan)
			.eq('is_active', true)
			.single();

		const txId = generateTxId(
			user.email || '',
			new_plan,
			pricing?.monthly_price_pence ?? null
		);

		// Insert billing history record
		const { error: historyError } = await serviceClient
			.from('billing_history')
			.insert({
				org_id,
				action: 'plan_change',
				from_plan: org.plan,
				to_plan: new_plan,
				reason,
				performed_by: user.id,
				effective_date: planStartedAt,
				stripe_transaction_id: txId
			});

		if (historyError) {
			console.error(`[${requestId}] Failed to insert billing history:`, historyError);
		}

		// Create audit entry
		const afterState = { plan: new_plan, plan_started_at: planStartedAt };
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'billing.plan_changed',
			action_category: 'billing',
			before_state: beforeState,
			after_state: afterState,
			reason,
			request_id: requestId
		});

		return json({
			success: true,
			diff: { before: beforeState, after: afterState },
			requestId
		});
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Plan change failed:`, err);
		throw error(500, 'Failed to change plan');
	}
};
