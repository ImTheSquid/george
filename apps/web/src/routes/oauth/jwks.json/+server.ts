import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth';

export const GET: RequestHandler = async () => {
	const client = await getOAuthClient();
	return json(client.jwks);
};
