import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import { createInvite, listInvites, revokeInvite } from '$lib/server/invites';
import { config } from '$lib/server/config';

function requireAdmin(userId: string | null): string {
	if (!userId) redirect(303, '/login');
	if (!getUser(userId)?.isAdmin) error(403, 'Admins only');
	return userId;
}

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals.userId);
	return { invites: listInvites(), appUrl: config.appUrl };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const userId = requireAdmin(locals.userId);
		const uses = Number((await request.formData()).get('maxUses') ?? 1);
		if (!Number.isInteger(uses) || uses < 1 || uses > 1000) return fail(400, { message: 'Uses must be 1–1000' });
		createInvite(userId, uses);
	},
	revoke: async ({ locals, request }) => {
		requireAdmin(locals.userId);
		revokeInvite(String((await request.formData()).get('code')));
	}
};
