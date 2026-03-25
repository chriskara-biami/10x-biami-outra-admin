/**
 * Role-Based Access Control — single source of truth for UI + API.
 */

export type AdminRole = 'read_only' | 'support' | 'billing' | 'platform_admin';

export type Permission =
	| 'dashboard:view'
	| 'accounts:view'
	| 'entitlements:view'
	| 'entitlements:mutate'
	| 'billing:view'
	| 'billing:mutate'
	| 'audit:view'
	| '*';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
	read_only: ['dashboard:view', 'accounts:view', 'entitlements:view', 'billing:view', 'audit:view'],
	support: [
		'dashboard:view',
		'accounts:view',
		'entitlements:view',
		'entitlements:mutate',
		'billing:view',
		'audit:view'
	],
	billing: [
		'dashboard:view',
		'accounts:view',
		'entitlements:view',
		'billing:view',
		'billing:mutate',
		'audit:view'
	],
	platform_admin: ['*']
};

/**
 * Check if the user's roles grant the required permission(s).
 * Returns true if ANY of the user's roles has ANY of the required permissions.
 */
export function hasPermission(
	userRoles: string[],
	requiredPermissions: Permission[]
): boolean {
	if (!userRoles || userRoles.length === 0) return false;

	for (const role of userRoles) {
		const permissions = ROLE_PERMISSIONS[role as AdminRole];
		if (!permissions) continue;

		// platform_admin has wildcard
		if (permissions.includes('*')) return true;

		for (const required of requiredPermissions) {
			if (permissions.includes(required)) return true;
		}
	}

	return false;
}

/**
 * Check if user has a specific role.
 */
export function hasRole(userRoles: string[], role: AdminRole): boolean {
	return userRoles.includes(role);
}

/**
 * Get all permissions for a set of roles (deduplicated).
 */
export function getPermissions(roles: string[]): Permission[] {
	const perms = new Set<Permission>();
	for (const role of roles) {
		const rolePerms = ROLE_PERMISSIONS[role as AdminRole];
		if (rolePerms) {
			for (const p of rolePerms) perms.add(p);
		}
	}
	return [...perms];
}
