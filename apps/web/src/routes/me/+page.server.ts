import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listMyLinks } from '$lib/server/queries';
import { deleteLink, saveLink } from '$lib/server/records';

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.userId) redirect(303, '/login');
	const toRead = url.searchParams.get('view') === 'queue';
	return { links: listMyLinks(locals.userId, { toRead }), toRead };
};

function requireUser(userId: string | null): string {
	if (!userId) redirect(303, '/login');
	return userId;
}

async function run(fn: () => Promise<unknown> | unknown) {
	try {
		await fn();
		return { ok: true };
	} catch (e) {
		console.error('[me]', e);
		return fail(400, { message: e instanceof Error ? e.message : 'Something went wrong' });
	}
}

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const userId = requireUser(locals.userId);
		const form = await request.formData();
		const url = String(form.get('url') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		if (!url) return fail(400, { message: 'Enter a URL' });
		return run(() => saveLink(userId, { url, title: title || undefined, toRead: form.get('toRead') === 'on' }));
	},
	toggleRead: async ({ locals, request }) => {
		const userId = requireUser(locals.userId);
		const form = await request.formData();
		return run(() => saveLink(userId, { url: String(form.get('url')), toRead: form.get('toRead') === 'true' }));
	},
	toggleFavorite: async ({ locals, request }) => {
		const userId = requireUser(locals.userId);
		const form = await request.formData();
		return run(() =>
			saveLink(userId, { url: String(form.get('url')), favorite: form.get('favorite') === 'true' })
		);
	},
	delete: async ({ locals, request }) => {
		const userId = requireUser(locals.userId);
		const form = await request.formData();
		return run(() => deleteLink(userId, String(form.get('id'))));
	}
};
