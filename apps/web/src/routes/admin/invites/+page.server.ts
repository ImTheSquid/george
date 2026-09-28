import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import {
	createInvite,
	listInviters,
	listInvites,
	revokeAllInvitesBy,
	revokeInvite,
	setInviteQuota
} from '$lib/server/invites';
import { deleteUsers } from '$lib/server/records';
import { config } from '$lib/server/config';

function requireAdmin(userId: string | null): string {
	if (!userId) redirect(303, '/login');
	if (!getUser(userId)?.isAdmin) error(403, 'Admins only');
	return userId;
}

export const load: PageServerLoad = ({ locals }) => {
	requireAdmin(locals.userId);
	return {
		invites: listInvites(),
		users: listInviters(),
		quotaDefault: config.inviteQuotaDefault,
		appUrl: config.appUrl
	};
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
	},
	setQuota: async ({ locals, request }) => {
		requireAdmin(locals.userId);
		const form = await request.formData();
		const raw = String(form.get('quota') ?? '').trim();
		const quota = raw === '' ? null : Number(raw);
		if (quota !== null && (!Number.isInteger(quota) || quota < 0 || quota > 1000))
			return fail(400, { message: 'Quota must be 0–1000, or blank for the default' });
		setInviteQuota(String(form.get('id')), quota);
	},
	revokeAll: async ({ locals, request }) => {
		requireAdmin(locals.userId);
		revokeAllInvitesBy(String((await request.formData()).get('id')));
	},
	deleteUser: async ({ locals, request }) => {
		requireAdmin(locals.userId);
		const form = await request.formData();
		const target = getUser(String(form.get('id')));
		if (!target) return fail(404, { message: 'No such user' });
		if (String(form.get('confirm') ?? '').trim().toLowerCase() !== target.username)
			return fail(400, { message: `Type ${target.username} to confirm` });
		const result = deleteUsers(target.id, form.get('withInvitees') === 'on');
		if ('error' in result) return fail(400, { message: result.error });
		return { message: `Deleted ${result.deleted.join(', ')}` };
	}
};
