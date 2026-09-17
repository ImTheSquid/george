import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { getFeed } from '$lib/server/queries';

/** The extension's new tab page: newest links and highlights from the people you follow. */
export const GET: RequestHandler = (event) => {
	const n = Number(event.url.searchParams.get('limit'));
	const limit = Math.min(Number.isFinite(n) && n > 0 ? n : 50, 100);
	return json({ items: getFeed(requireUser(event), limit) });
};
