import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { config } from '$lib/server/config';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.userId) redirect(303, '/');
	return { inviteRequired: config.inviteRequired, inviteCode: url.searchParams.get('invite') ?? '' };
};
