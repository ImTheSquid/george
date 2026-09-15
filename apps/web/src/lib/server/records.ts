import { and, eq } from 'drizzle-orm';
import { normalizeUrl, urlHash } from '@george/shared';
import { db } from '$lib/server/db';
import { follow, link, user } from '$lib/server/db/schema';
import { newId, now } from '$lib/server/ids';

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
