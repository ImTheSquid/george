import type { LayoutServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import { canInvite } from '$lib/server/invites';

export const load: LayoutServerLoad = ({ locals }) => {
	const u = locals.userId ? getUser(locals.userId) : null;
	return {
		user: u
			? { id: u.id, username: u.username, displayName: u.displayName, isAdmin: u.isAdmin, canInvite: canInvite(u) }
			: null
	};
};
