import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiError, readJson, requireUser } from '$lib/server/api';
import { deleteHighlight, updateHighlightNote } from '$lib/server/records';

export const DELETE: RequestHandler = (event) => {
	deleteHighlight(requireUser(event), event.params.id);
	return json({ ok: true });
};

export const POST: RequestHandler = async (event) => {
	const userId = requireUser(event);
	const { note } = await readJson<{ note: string | null }>(event.request);
	try {
		updateHighlightNote(userId, event.params.id, note);
		return json({ ok: true });
	} catch (e) {
		return apiError(e);
	}
};
