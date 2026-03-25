import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasPermission } from '$lib/utils/permissions';
import { createAuditEntry } from '$lib/utils/audit';

export const POST: RequestHandler = async (event) => {
	const { serviceClient, adminRoles, user, requestId } = event.locals;

	if (!hasPermission(adminRoles, ['accounts:view'])) {
		throw error(403, 'Insufficient permissions');
	}

	const body = await event.request.json();
	const { org_id, field_name, record_id } = body;

	if (!org_id || !field_name || !record_id) {
		throw error(400, 'Missing required fields: org_id, field_name, record_id');
	}

	const allowedFields = ['email', 'api_key', 'billing_id'];
	if (!allowedFields.includes(field_name)) {
		throw error(400, `Invalid field_name. Allowed: ${allowedFields.join(', ')}`);
	}

	try {
		// Log the reveal action for audit trail
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id,
			action_type: 'data.revealed',
			action_category: 'data',
			after_state: { field_name, record_id },
			request_id: requestId
		});

		// Fetch the unmasked value based on field_name
		let value: string | null = null;

		if (field_name === 'email') {
			const { data: userData } = await serviceClient.auth.admin.getUserById(record_id);
			value = userData?.user?.email || null;
		} else if (field_name === 'api_key') {
			const { data } = await serviceClient
				.from('census_destinations')
				.select('api_key')
				.eq('id', record_id)
				.single();
			value = data?.api_key || null;
		} else if (field_name === 'billing_id') {
			const { data } = await serviceClient
				.from('organizations')
				.select('billing_id')
				.eq('id', record_id)
				.single();
			value = data?.billing_id || null;
		}

		if (value === null) {
			throw error(404, 'Record not found');
		}

		return json({ value, requestId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Reveal failed:`, err);
		throw error(500, 'Failed to reveal field');
	}
};
