import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { destroySession } from '$lib/server/session';

export const actions: Actions = {
	default: async ({ cookies }) => {
		destroySession(cookies);
		redirect(303, '/');
	}
};
