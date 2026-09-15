import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireUser } from '$lib/server/api';
import { deleteComment } from '$lib/server/records';

export const DELETE: RequestHandler = (event) => {
	deleteComment(requireUser(event), event.params.id);
	return json({ ok: true });
};
