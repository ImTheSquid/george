import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import { canInvite, createUserInvite, inviteAllowance, listInvites, revokeInvite } from '$lib/server/invites';
import { config } from '$lib/server/config';

function requireInviter(userId: string | null) {
	if (!userId) redirect(303, '/login');
	const u = getUser(userId);
	if (!u || !canInvite(u)) error(403, "You can't create invites");
	return u;
}

export const load: PageServerLoad = ({ locals }) => {
	const u = requireInviter(locals.userId);
	return { allowance: inviteAllowance(u), invites: listInvites(u.id), appUrl: config.appUrl };
};

export const actions: Actions = {
	create: ({ locals }) => {
		const u = requireInviter(locals.userId);
		if (!createUserInvite(u.id)) return fail(400, { message: 'No invites left' });
	},
	revoke: async ({ locals, request }) => {
		const u = requireInviter(locals.userId);
		revokeInvite(String((await request.formData()).get('code')), u.id);
	}
};
