import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiError, readJson, requireUser } from '$lib/server/api';
import { createHighlight, type HighlightInput } from '$lib/server/records';

export const POST: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const body = await readJson<HighlightInput>(event.request);
	try {
		return json(await createHighlight(userId, body));
	} catch (e) {
		return apiError(e);
	}
};
