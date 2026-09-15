import type { PageServerLoad } from './$types';
import { getFeed } from '$lib/server/queries';

export const load: PageServerLoad = ({ locals }) => {
	return { feed: locals.userId ? getFeed(locals.userId) : null };
};
