import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchExport, parseUserLink } from '@george/curius';

/** Raw Curius export as a download, so users can keep a copy regardless of george. */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const userLink = parseUserLink(url.searchParams.get('user') ?? '');
	if (!/^[a-z0-9-]+$/.test(userLink)) error(400, 'user parameter required');
	const data = await fetchExport(userLink, fetch);
	return json(data, {
		headers: { 'content-disposition': `attachment; filename="curius-${userLink}.json"` }
	});
};
