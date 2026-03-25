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
	const { user_id, org_id, new_password } = body;

	if (!user_id || !new_password) {
		throw error(400, 'Missing required fields: user_id, new_password');
	}

	if (new_password.length < 8) {
		throw error(400, 'Password must be at least 8 characters');
	}

	try {
		const { data, error: updateError } = await serviceClient.auth.admin.updateUserById(
			user_id,
			{ password: new_password }
		);

		if (updateError) {
			throw new Error(`Failed to update password: ${updateError.message}`);
		}

		// Audit log — never store the password itself
		await createAuditEntry(serviceClient, {
			admin_user_id: user.id,
			org_id: org_id || undefined,
			target_user_id: user_id,
			action_type: 'account.password_changed',
			action_category: 'account',
			after_state: { user_id, changed_at: new Date().toISOString() },
			request_id: requestId
		});

		return json({ success: true, requestId });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error(`[${requestId}] Password change failed:`, err);
		throw error(500, 'Failed to change password');
	}
};
