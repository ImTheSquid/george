import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getFollowingIds, listUsers } from '$lib/server/queries';
import { followUser, unfollowUser } from '$lib/server/records';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	const following = new Set(getFollowingIds(locals.userId));
	return {
		people: listUsers()
			.filter((u) => u.id !== locals.userId)
			.map((u) => ({ ...u, following: following.has(u.id) }))
	};
};

export const actions: Actions = {
	follow: async ({ locals, request }) => {
		if (!locals.userId) redirect(303, '/login');
		followUser(locals.userId, String((await request.formData()).get('id')));
	},
	unfollow: async ({ locals, request }) => {
		if (!locals.userId) redirect(303, '/login');
		unfollowUser(locals.userId, String((await request.formData()).get('id')));
	}
};
