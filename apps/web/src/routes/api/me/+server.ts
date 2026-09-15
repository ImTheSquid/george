import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { getUser } from '$lib/server/queries';

export const GET: RequestHandler = (event) => {
	const u = getUser(requireUser(event));
	return json({ id: u?.id, username: u?.username, displayName: u?.displayName });
};
