import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { computePlanDiff } from '$lib/config/plan-entitlements';

export const POST: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['billing:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, new_plan } = body;

	if (!org_id || !new_plan) {
		throw error(400, 'Missing required fields: org_id, new_plan');
	}

	try {
		// Fetch current plan from organizations
		const { data: org, error: orgError } = await serviceClient
			.from('organizations')
			.select('plan')
			.eq('id', org_id)
			.single();

		if (orgError || !org) {
			throw error(404, 'Organization not found');
		}

		const diff = computePlanDiff(org.plan, new_plan);
		return json({ diff, requestId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Plan preview failed:`, err);
		throw error(500, 'Failed to preview plan change');
	}
};
