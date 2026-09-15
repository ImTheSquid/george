import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { normalizeUrl, urlHash } from '@george/shared';
import { apiError, readJson, requireUser } from '$lib/server/api';
import { getNetworkForUrl } from '$lib/server/queries';
import { deleteLinkByUrl, saveLink, type LinkInput } from '$lib/server/records';

/** Everything the extension needs about one page: my link, friends' links, all visible highlights. */
export const GET: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const raw = event.url.searchParams.get('url');
	if (!raw) error(400, 'url required');
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
