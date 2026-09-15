import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import { createInvite, listInvites } from '$lib/server/invites';

function requireAdmin(userId: string | null): string {
	if (!userId) redirect(303, '/login');
	if (!getUser(userId)?.isAdmin) error(403, 'Admins only');
	return userId;
}

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals.userId);
	return { invites: listInvites() };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		createInvite(requireAdmin(locals.userId));
	}
};
