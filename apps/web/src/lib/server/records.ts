import { and, eq } from 'drizzle-orm';
import { normalizeUrl, urlHash } from '@george/shared';
import { db } from '$lib/server/db';
import { comment, follow, highlight, link, user } from '$lib/server/db/schema';
import { newId, now } from '$lib/server/ids';
import { canSeeSubject } from '$lib/server/queries';

export type LinkInput = {
	url: string;
	title?: string;
	description?: string;
	toRead?: boolean;
	favorite?: boolean;
	tags?: string[];
};

/** Create the user's link for a URL, or update the existing one. Returns the link id. */
export async function saveLink(userId: string, input: LinkInput): Promise<string> {
	const url = normalizeUrl(input.url);
	const hash = await urlHash(url);
	const existing = db
		.select()
		.from(link)
		.where(and(eq(link.userId, userId), eq(link.urlHash, hash)))
		.get();
	const t = now();
	if (existing) {
		db.update(link)
			.set({
				title: input.title ?? existing.title,
				description: input.description ?? existing.description,
				toRead: input.toRead ?? existing.toRead,
				favorite: input.favorite ?? existing.favorite,
				tags: input.tags ?? existing.tags,
				updatedAt: t
			})
			.where(eq(link.id, existing.id))
			.run();
		return existing.id;
	}
	const id = newId();
	db.insert(link)
		.values({
			id,
			userId,
			url,
			urlHash: hash,
			title: input.title ?? null,
			description: input.description ?? null,
			toRead: input.toRead ?? false,
			favorite: input.favorite ?? false,
			tags: input.tags ?? [],
			createdAt: t,
			updatedAt: t
		})
		.run();
	return id;
}

export function deleteLink(userId: string, id: string): void {
	db.delete(link).where(and(eq(link.id, id), eq(link.userId, userId))).run();
}

export async function deleteLinkByUrl(userId: string, rawUrl: string): Promise<void> {
	const hash = await urlHash(normalizeUrl(rawUrl));
	db.delete(link).where(and(eq(link.userId, userId), eq(link.urlHash, hash))).run();
}

export type HighlightInput = {
	url: string;
	/** Page title, used if the highlight has to create the link. */
	title?: string;
	exact: string;
	prefix?: string;
	suffix?: string;
	start?: number;
	end?: number;
	note?: string;
};

/** Highlighting a page also saves it. Returns the new highlight and its link id. */
export async function createHighlight(userId: string, input: HighlightInput): Promise<{ id: string; linkId: string }> {
	const exact = input.exact.trim();
	if (!exact) throw new Error('Nothing selected');
	const url = normalizeUrl(input.url);
	const hash = await urlHash(url);
	const linkId = await saveLink(userId, { url, title: input.title });
	const id = newId();
	db.insert(highlight)
		.values({
			id,
			userId,
			linkId,
			url,
			urlHash: hash,
			exact,
			prefix: input.prefix || null,
			suffix: input.suffix || null,
			start: input.start ?? null,
			end: input.end ?? null,
			note: input.note?.trim() || null,
			createdAt: now()
		})
		.run();
	return { id, linkId };
}

export function deleteHighlight(userId: string, id: string): void {
	db.delete(highlight).where(and(eq(highlight.id, id), eq(highlight.userId, userId))).run();
}

export function updateHighlightNote(userId: string, id: string, note: string | null): void {
	db.update(highlight)
		.set({ note: note?.trim() || null })
		.where(and(eq(highlight.id, id), eq(highlight.userId, userId)))
		.run();
}

export type CommentInput = { subjectType: 'link' | 'highlight' | 'comment'; subjectId: string; text: string };

export function createComment(userId: string, input: CommentInput): string {
	const text = input.text.trim();
	if (!text) throw new Error('Empty comment');
	if (text.length > 5000) throw new Error('Comment too long');
	if (!['link', 'highlight', 'comment'].includes(input.subjectType)) throw new Error('Bad subject');
	if (!canSeeSubject(userId, input.subjectType, input.subjectId)) throw new Error('Nothing to comment on');
	const id = newId();
	db.insert(comment)
		.values({ id, userId, subjectType: input.subjectType, subjectId: input.subjectId, text, createdAt: now() })
		.run();
	return id;
}

export function deleteComment(userId: string, id: string): void {
	db.delete(comment).where(and(eq(comment.id, id), eq(comment.userId, userId))).run();
}

export function followUser(userId: string, subjectId: string): void {
	if (userId === subjectId) return;
	db.insert(follow).values({ userId, subjectId, createdAt: now() }).onConflictDoNothing().run();
}

export function unfollowUser(userId: string, subjectId: string): void {
	db.delete(follow).where(and(eq(follow.userId, userId), eq(follow.subjectId, subjectId))).run();
}

export function updateProfile(
	userId: string,
	input: { displayName?: string | null; description?: string | null; website?: string | null }
): void {
	db.update(user).set(input).where(eq(user.id, userId)).run();
}
