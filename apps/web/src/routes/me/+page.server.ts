import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listMyLinks } from '$lib/server/queries';
import { deleteLink, NotLoggedIn, saveLink } from '$lib/server/records';

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.did) redirect(303, '/login');
	const toRead = url.searchParams.get('view') === 'queue';
	return { links: listMyLinks(locals.did, { toRead }), toRead };
};

function requireDid(did: string | null): string {
	if (!did) redirect(303, '/login');
	return did;
}

async function run(fn: () => Promise<unknown>) {
	try {
		await fn();
		return { ok: true };
	} catch (e) {
		if (e instanceof NotLoggedIn) redirect(303, '/login');
		console.error('[me]', e);
		return fail(400, { message: e instanceof Error ? e.message : 'Something went wrong' });
	}
}

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const did = requireDid(locals.did);
		const form = await request.formData();
		const url = String(form.get('url') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		if (!url) return fail(400, { message: 'Enter a URL' });
		return run(() => saveLink(did, { url, title: title || undefined, toRead: form.get('toRead') === 'on' }));
	},
	toggleRead: async ({ locals, request }) => {
		const did = requireDid(locals.did);
		const form = await request.formData();
		return run(() => saveLink(did, { url: String(form.get('url')), toRead: form.get('toRead') === 'true' }));
	},
	toggleFavorite: async ({ locals, request }) => {
		const did = requireDid(locals.did);
		const form = await request.formData();
		return run(() => saveLink(did, { url: String(form.get('url')), favorite: form.get('favorite') === 'true' }));
	},
	delete: async ({ locals, request }) => {
		const did = requireDid(locals.did);
		const form = await request.formData();
		return run(() => deleteLink(did, String(form.get('uri'))));
	}
};
