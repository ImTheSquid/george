import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { config } from '$lib/server/config';
import { getOAuthClient, SCOPE } from '$lib/server/oauth';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.did) redirect(303, '/');
	return { handleDomain: config.handleDomain, username: url.searchParams.get('username') ?? '' };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '')
			.trim()
			.toLowerCase();
		if (!username) return fail(400, { username, message: 'Enter your username' });
		const handle = username.includes('.') ? username : `${username}.${config.handleDomain}`;

		let authUrl: URL;
		try {
			const client = await getOAuthClient();
			authUrl = await client.authorize(handle, { scope: SCOPE });
		} catch (e) {
			console.error('[login]', e);
			return fail(400, { username, message: `Could not start login for ${handle}` });
		}
		redirect(303, authUrl.toString());
	}
};
