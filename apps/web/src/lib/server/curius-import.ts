import { and, eq, inArray } from 'drizzle-orm';
import { fetchExport, type CuriusComment, type CuriusExport } from '@george/curius';
import { normalizeUrl, urlHash } from '@george/shared';
import { db } from '$lib/server/db';
import { comment, follow, highlight, link, user } from '$lib/server/db/schema';
import { newId, now } from '$lib/server/ids';

export type ImportResult = {
	links: number;
	highlights: number;
	comments: number;
	skipped: number;
	followed: string[];
	/** Curius friends with no george account yet. */
	unmatched: { name: string; userLink: string }[];
};

export async function importCurius(userId: string, userLink: string, fetchFn?: typeof fetch): Promise<ImportResult> {
	const data = await fetchExport(userLink, fetchFn);
	const result = await importExport(userId, data);
	db.update(user).set({ curiusUserLink: data.profile.userLink }).where(eq(user.id, userId)).run();
	return result;
}

/** Idempotent: links are matched by URL, highlights by (url, exact). */
export async function importExport(userId: string, data: CuriusExport): Promise<ImportResult> {
	const result: ImportResult = { links: 0, highlights: 0, comments: 0, skipped: 0, followed: [], unmatched: [] };
	const t = now();
	const owner = data.profile.id;

	for (const l of data.links) {
		let url: string;
		try {
			url = normalizeUrl(l.link);
		} catch {
			result.skipped++;
			continue;
		}
		const hash = await urlHash(url);
		let linkRow = db
			.select()
			.from(link)
			.where(and(eq(link.userId, userId), eq(link.urlHash, hash)))
			.get();
		if (!linkRow) {
			const row = {
				id: newId(),
				userId,
				url,
				urlHash: hash,
				title: l.title || null,
				description: l.snippet || null,
				toRead: l.toRead ?? false,
				favorite: l.favorite,
				tags: l.topics.map((tp) => tp.topic),
				createdAt: l.createdDate,
				updatedAt: l.modifiedDate ?? l.createdDate
			};
			db.insert(link).values(row).run();
			linkRow = { ...row };
			result.links++;
		}

		for (const c of l.comments) importCommentTree(userId, owner, 'link', linkRow.id, c, result);

		for (const h of l.highlights) {
			const exists = db
				.select({ id: highlight.id })
				.from(highlight)
				.where(and(eq(highlight.userId, userId), eq(highlight.urlHash, hash), eq(highlight.exact, h.highlight)))
				.get();
			if (exists) continue;
			const hid = newId();
			db.insert(highlight)
				.values({
					id: hid,
					userId,
					linkId: linkRow.id,
					url,
					urlHash: hash,
					exact: h.highlight,
					prefix: h.leftContext || null,
					suffix: h.rightContext || null,
					note: h.comment?.text || null,
					createdAt: h.createdDate
				})
				.run();
			result.highlights++;
			// The highlight's own comment became its note; replies hang off the highlight.
			for (const r of h.comment?.replies ?? []) importCommentTree(userId, owner, 'highlight', hid, r, result);
		}
	}

	// Reconnect friends who already imported their own Curius account.
	const friendLinks = data.profile.followingUsers.map((f) => f.userLink);
	const matched = friendLinks.length
		? db.select({ id: user.id, curiusUserLink: user.curiusUserLink }).from(user).where(inArray(user.curiusUserLink, friendLinks)).all()
		: [];
	for (const m of matched) {
		if (m.id === userId) continue;
		db.insert(follow).values({ userId, subjectId: m.id, createdAt: t }).onConflictDoNothing().run();
		result.followed.push(m.curiusUserLink!);
	}
	const matchedSet = new Set(matched.map((m) => m.curiusUserLink));
	result.unmatched = data.profile.followingUsers
		.filter((f) => !matchedSet.has(f.userLink))
		.map((f) => ({ name: `${f.firstName} ${f.lastName}`.trim(), userLink: f.userLink }));
	return result;
}

/** Only the importing user's own comments belong in their account; others' (and replies under them) are dropped. */
function importCommentTree(
	userId: string,
	owner: number,
	subjectType: 'link' | 'highlight' | 'comment',
	subjectId: string,
	c: CuriusComment,
	result: ImportResult
): void {
	if (c.userId !== owner) return;
	const exists = db
		.select({ id: comment.id })
		.from(comment)
		.where(and(eq(comment.userId, userId), eq(comment.subjectType, subjectType), eq(comment.subjectId, subjectId), eq(comment.text, c.text)))
		.get();
	let id = exists?.id;
	if (!id) {
		id = newId();
		db.insert(comment).values({ id, userId, subjectType, subjectId, text: c.text, createdAt: c.createdDate }).run();
		result.comments++;
	}
	for (const r of c.replies ?? []) importCommentTree(userId, owner, 'comment', id, r, result);
}
