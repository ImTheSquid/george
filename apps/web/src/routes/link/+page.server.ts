import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { normalizeUrl, urlHash } from '@george/shared';
import { getNetworkForUrl } from '$lib/server/queries';
import { createComment, deleteComment, saveLink, type CommentInput } from '$lib/server/records';

function requireUser(userId: string | null): string {
	if (!userId) redirect(303, '/login');
	return userId;
}

function pageUrl(raw: string | null): string {
	if (!raw) error(400, 'url required');
	try {
		return normalizeUrl(raw);
	} catch {
		error(400, 'unsupported url');
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = requireUser(locals.userId);
	const target = pageUrl(url.searchParams.get('url'));
	const network = getNetworkForUrl(userId, await urlHash(target));
	const title = network.mine?.title ?? network.friends.find((f) => f.link.title)?.link.title ?? null;
	return { url: target, title, network };
};

export const actions: Actions = {
	comment: async ({ locals, request }) => {
		const userId = requireUser(locals.userId);
		const f = await request.formData();
		try {
			createComment(userId, {
				subjectType: String(f.get('subjectType')) as CommentInput['subjectType'],
				subjectId: String(f.get('subjectId')),
				text: String(f.get('text') ?? '')
			});
		} catch (e) {
			return fail(400, { message: e instanceof Error ? e.message : 'Could not comment' });
		}
	},
	deleteComment: async ({ locals, request }) => {
		deleteComment(requireUser(locals.userId), String((await request.formData()).get('id')));
	},
	save: async ({ locals, request, url }) => {
		const userId = requireUser(locals.userId);
		const f = await request.formData();
		await saveLink(userId, { url: pageUrl(url.searchParams.get('url')), title: String(f.get('title') ?? '') || undefined });
	}
};
