import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiError, readJson, requireUser } from '$lib/server/api';
import { createComment, type CommentInput } from '$lib/server/records';

export const POST: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const body = await readJson<CommentInput>(event.request);
	try {
		return json({ id: createComment(userId, body) });
	} catch (e) {
		return apiError(e);
	}
};
