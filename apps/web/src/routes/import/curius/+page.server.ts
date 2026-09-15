import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { parseUserLink } from '@george/curius';
import { getUser } from '$lib/server/queries';
import { importCurius } from '$lib/server/curius-import';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.userId) redirect(303, '/login');
	return { curiusUserLink: getUser(locals.userId)?.curiusUserLink ?? null };
};

export const actions: Actions = {
	default: async ({ locals, request, fetch }) => {
		if (!locals.userId) redirect(303, '/login');
		const userLink = parseUserLink(String((await request.formData()).get('userLink') ?? ''));
		if (!/^[a-z0-9-]+$/.test(userLink)) return fail(400, { userLink, message: 'Enter your Curius profile URL or slug.' });
		try {
			return { userLink, result: await importCurius(locals.userId, userLink, fetch) };
		} catch (e) {
			console.error('[curius import]', e);
			return fail(400, { userLink, message: e instanceof Error ? e.message : 'Import failed' });
		}
	}
};
