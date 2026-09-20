import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeUrl, urlHash } from '@george/shared';
import { apiError, readJson, requireUser } from '$lib/server/api';
import { getNetworkForUrl } from '$lib/server/queries';
import { deleteLinkByUrl, saveLink, type LinkInput } from '$lib/server/records';

/**
 * Everything the extension needs about one page: my link, friends' links, all visible highlights.
 *
 * `h` is the preferred form and the only one the extension uses — a lookup runs for every page
 * you open, so the URL itself must stay out of the query string and therefore out of access logs.
 * `url` remains for older builds still in the wild.
 */
export const GET: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const hash = event.url.searchParams.get('h');
	if (hash) {
		if (!/^[0-9a-f]{64}$/.test(hash)) error(400, 'bad hash');
		return json(getNetworkForUrl(userId, hash));
	}
	const raw = event.url.searchParams.get('url');
	if (!raw) error(400, 'url or h required');
	let url: string;
	try {
		url = normalizeUrl(raw);
	} catch {
		return json({ url: raw, unsupported: true, mine: null, friends: [], highlights: [] });
	}
	return json({ url, unsupported: false, ...getNetworkForUrl(userId, await urlHash(url)) });
};

export const POST: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const body = await readJson<LinkInput>(event.request);
	try {
		const id = await saveLink(userId, body);
		return json({ id });
	} catch (e) {
		return apiError(e);
	}
};

export const DELETE: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const { url } = await readJson<{ url: string }>(event.request);
	try {
		await deleteLinkByUrl(userId, url);
		return json({ ok: true });
	} catch (e) {
		return apiError(e);
	}
};
