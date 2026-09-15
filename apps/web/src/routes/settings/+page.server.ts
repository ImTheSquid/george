import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUser } from '$lib/server/queries';
import { updateProfile } from '$lib/server/records';
import { createToken, listTokens, revokeToken } from '$lib/server/tokens';
import { config } from '$lib/server/config';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	const u = getUser(locals.userId)!;
	return {
		profile: { displayName: u.displayName ?? '', description: u.description ?? '', website: u.website ?? '' },
		tokens: listTokens(locals.userId),
		appUrl: config.appUrl
	};
};

export const actions: Actions = {
	profile: async ({ locals, request }) => {
		if (!locals.userId) redirect(303, '/login');
		const f = await request.formData();
		const website = String(f.get('website') ?? '').trim();
		if (website && !/^https?:\/\//.test(website)) return fail(400, { message: 'Website must start with http(s)://' });
		updateProfile(locals.userId, {
			displayName: String(f.get('displayName') ?? '').trim() || null,
			description: String(f.get('description') ?? '').trim() || null,
			website: website || null
		});
		return { saved: true };
	},
	/** Mint a token and hand it to the extension's content script via the page. */
	connect: async ({ locals }) => {
		if (!locals.userId) redirect(303, '/login');
		return { token: createToken(locals.userId, 'browser extension') };
	},
	revoke: async ({ locals, request }) => {
		if (!locals.userId) redirect(303, '/login');
		revokeToken(locals.userId, String((await request.formData()).get('id')));
	}
};
