import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ locals }) => {
		// Update admin session logout timestamp
		if (locals.user && locals.adminSessionId) {
			await locals.serviceClient
				.from('admin_sessions')
				.update({ logout_at: new Date().toISOString() })
				.eq('id', locals.adminSessionId);
		}

		await locals.supabase.auth.signOut();
		redirect(303, '/login');
	}
};
