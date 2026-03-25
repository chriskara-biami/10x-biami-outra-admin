import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		redirect(303, '/login');
	}

	if (!locals.adminRoles || locals.adminRoles.length === 0) {
		error(403, 'Forbidden');
	}

	return {
		session,
		user,
		roles: locals.adminRoles
	};
};
