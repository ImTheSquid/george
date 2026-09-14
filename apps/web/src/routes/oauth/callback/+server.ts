import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth';
import { upsertActor } from '$lib/server/actors';
import { createSession } from '$lib/server/session';

export const GET: RequestHandler = async ({ url, cookies }) => {
	let did: string;
	try {
		const client = await getOAuthClient();
		const { session } = await client.callback(url.searchParams);
		did = session.did;
	} catch (e) {
		console.error('[oauth callback]', e);
		error(400, 'Login failed. Please try again.');
	}
	await upsertActor(did);
	createSession(cookies, did);
	redirect(303, '/');
};
