import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserByUsername, isFollowing, listLinksBy } from '$lib/server/queries';

export const load: PageServerLoad = ({ params, locals }) => {
	const profile = getUserByUsername(params.username);
	if (!profile) error(404, 'No such user');
	return {
		profile,
		links: listLinksBy(profile.id),
		following: locals.userId ? isFollowing(locals.userId, profile.id) : false,
		isMe: locals.userId === profile.id
	};
};
