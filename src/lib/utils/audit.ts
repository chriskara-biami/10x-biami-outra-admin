import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEntry {
	admin_user_id: string;
	org_id?: string;
	target_user_id?: string;
	action_type: string;
	action_category: 'entitlement' | 'billing' | 'account' | 'auth' | 'data';
	before_state?: Record<string, unknown>;
	after_state?: Record<string, unknown>;
	reason?: string;
	ip_address?: string;
	user_agent?: string;
	request_id?: string;
}

/**
 * Insert an immutable audit log entry.
 * Uses the service role client to bypass RLS.
 */
export async function createAuditEntry(
	serviceClient: SupabaseClient,
	entry: AuditEntry
): Promise<void> {
	const { error } = await serviceClient.from('admin_audit_log').insert(entry);
	if (error) {
		console.error('[Audit] Failed to create audit entry:', error);
		throw new Error(`Audit log failure: ${error.message}`);
	}
}
