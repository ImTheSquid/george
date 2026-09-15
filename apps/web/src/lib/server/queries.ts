import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { comment, follow, highlight, link, user } from '$lib/server/db/schema';

export type UserRow = typeof user.$inferSelect;
export type LinkRow = typeof link.$inferSelect;
export type HighlightRow = typeof highlight.$inferSelect;
export type CommentRow = typeof comment.$inferSelect;
export type CommentView = CommentRow & { user: PublicUser; mine: boolean };

export type PublicUser = Pick<UserRow, 'id' | 'username' | 'displayName' | 'description' | 'website'>;

export type FeedItem =
	| { kind: 'link'; user: PublicUser; link: LinkRow; createdAt: string }
	| { kind: 'highlight'; user: PublicUser; highlight: HighlightRow; createdAt: string };

const publicUser = {
	id: user.id,
	username: user.username,
	displayName: user.displayName,
	description: user.description,
	website: user.website
};

export function getUser(id: string): UserRow | null {
	return db.select().from(user).where(eq(user.id, id)).get() ?? null;
}

export function getUserByUsername(username: string): PublicUser | null {
	return db.select(publicUser).from(user).where(eq(user.username, username.toLowerCase())).get() ?? null;
}

export function listMyLinks(userId: string, opts: { toRead?: boolean; limit?: number } = {}): LinkRow[] {
	const conds = [eq(link.userId, userId)];
	if (opts.toRead !== undefined) conds.push(eq(link.toRead, opts.toRead));
	return db
		.select()
		.from(link)
		.where(and(...conds))
		.orderBy(desc(link.createdAt))
		.limit(opts.limit ?? 200)
		.all();
}

export function getFollowingIds(userId: string): string[] {
	return db
		.select({ subjectId: follow.subjectId })
		.from(follow)
		.where(eq(follow.userId, userId))
		.all()
		.map((r) => r.subjectId);
}

export function isFollowing(userId: string, subjectId: string): boolean {
	return !!db
		.select({ userId: follow.userId })
		.from(follow)
		.where(and(eq(follow.userId, userId), eq(follow.subjectId, subjectId)))
		.get();
}

/** Newest links and highlights from the accounts `userId` follows. */
export function getFeed(userId: string, limit = 100): FeedItem[] {
	const ids = getFollowingIds(userId);
	if (ids.length === 0) return [];
	const links = db
		.select({ link, user: publicUser })
		.from(link)
		.innerJoin(user, eq(user.id, link.userId))
		.where(and(inArray(link.userId, ids), eq(link.toRead, false)))
		.orderBy(desc(link.createdAt))
		.limit(limit)
		.all();
	const highlights = db
		.select({ highlight, user: publicUser })
		.from(highlight)
		.innerJoin(user, eq(user.id, highlight.userId))
		.where(inArray(highlight.userId, ids))
		.orderBy(desc(highlight.createdAt))
		.limit(limit)
		.all();
	const items: FeedItem[] = [
		...links.map((r) => ({ kind: 'link' as const, user: r.user, link: r.link, createdAt: r.link.createdAt })),
		...highlights.map((r) => ({
			kind: 'highlight' as const,
			user: r.user,
			highlight: r.highlight,
			createdAt: r.highlight.createdAt
		}))
	];
	items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	return items.slice(0, limit);
}

export type Network = {
	mine: LinkRow | null;
	friends: { user: PublicUser; link: LinkRow }[];
	highlights: { user: PublicUser; highlight: HighlightRow; mine: boolean }[];
	/** Flat; threads are rebuilt client-side via subjectType/subjectId. */
	comments: CommentView[];
};

/** One page as seen by `userId`: their own link, followed users' links, those users' highlights, and the comments on all of it. */
export function getNetworkForUrl(userId: string, hash: string): Network {
	const ids = [userId, ...getFollowingIds(userId)];
	const links = db
		.select({ link, user: publicUser })
		.from(link)
		.innerJoin(user, eq(user.id, link.userId))
		.where(and(eq(link.urlHash, hash), inArray(link.userId, ids)))
		.all();
	const highlights = db
		.select({ highlight, user: publicUser })
		.from(highlight)
		.innerJoin(user, eq(user.id, highlight.userId))
		.where(and(eq(highlight.urlHash, hash), inArray(highlight.userId, ids)))
		.orderBy(highlight.createdAt)
		.all();
	const comments = getComments(
		userId,
		ids,
		links.map((r) => r.link.id),
		highlights.map((r) => r.highlight.id)
	);
	return {
		mine: links.find((r) => r.link.userId === userId)?.link ?? null,
		friends: links.filter((r) => r.link.userId !== userId),
		highlights: highlights.map((r) => ({ ...r, mine: r.highlight.userId === userId })),
		comments
	};
}

/**
 * Comments on the given links/highlights and, recursively, replies to those comments.
 * Visible: written by someone in `networkIds`, or by anyone when the subject belongs to `userId`
 * (so people always see replies to their own stuff).
 */
export function getComments(userId: string, networkIds: string[], linkIds: string[], highlightIds: string[]): CommentView[] {
	const out: CommentView[] = [];
	let frontier: { type: 'link' | 'highlight' | 'comment'; ids: string[] }[] = [
		{ type: 'link', ids: linkIds },
		{ type: 'highlight', ids: highlightIds }
	];
	const myLinks = new Set(db.select({ id: link.id }).from(link).where(and(eq(link.userId, userId), inArray(link.id, linkIds.length ? linkIds : ['']))).all().map((r) => r.id));
	const myHighlights = new Set(db.select({ id: highlight.id }).from(highlight).where(and(eq(highlight.userId, userId), inArray(highlight.id, highlightIds.length ? highlightIds : ['']))).all().map((r) => r.id));
	const mySubjects = new Set([...myLinks, ...myHighlights]);

	for (let depth = 0; depth < 8 && frontier.length; depth++) {
		const next: string[] = [];
		for (const f of frontier) {
			if (f.ids.length === 0) continue;
			const rows = db
				.select({ comment, user: publicUser })
				.from(comment)
				.innerJoin(user, eq(user.id, comment.userId))
				.where(and(eq(comment.subjectType, f.type), inArray(comment.subjectId, f.ids)))
				.orderBy(comment.createdAt)
				.all();
			for (const r of rows) {
				const visible = networkIds.includes(r.comment.userId) || mySubjects.has(r.comment.subjectId);
				if (!visible) continue;
				out.push({ ...r.comment, user: r.user, mine: r.comment.userId === userId });
				next.push(r.comment.id);
				if (r.comment.userId === userId) mySubjects.add(r.comment.id);
			}
		}
		frontier = [{ type: 'comment', ids: next }];
	}
	return out;
}

export function getLinkById(id: string): (LinkRow & { user: PublicUser }) | null {
	const r = db.select({ link, user: publicUser }).from(link).innerJoin(user, eq(user.id, link.userId)).where(eq(link.id, id)).get();
	return r ? { ...r.link, user: r.user } : null;
}

export function getHighlightById(id: string): HighlightRow | null {
	return db.select().from(highlight).where(eq(highlight.id, id)).get() ?? null;
}

export function getCommentById(id: string): CommentRow | null {
	return db.select().from(comment).where(eq(comment.id, id)).get() ?? null;
}

/** Does `userId` see this subject: their own, or owned by someone they follow (or a reply chain into that). */
export function canSeeSubject(userId: string, type: 'link' | 'highlight' | 'comment', id: string): boolean {
	const ids = [userId, ...getFollowingIds(userId)];
	for (let depth = 0; depth < 8; depth++) {
		if (type === 'link') {
			const r = db.select({ userId: link.userId }).from(link).where(eq(link.id, id)).get();
			return !!r && ids.includes(r.userId);
		}
		if (type === 'highlight') {
			const r = db.select({ userId: highlight.userId }).from(highlight).where(eq(highlight.id, id)).get();
			return !!r && ids.includes(r.userId);
		}
		const c = getCommentById(id);
		if (!c) return false;
		if (c.userId === userId) return true;
		type = c.subjectType;
		id = c.subjectId;
	}
	return false;
}

export function listUsers(limit = 500): PublicUser[] {
	return db.select(publicUser).from(user).orderBy(user.username).limit(limit).all();
}

export function listLinksBy(userId: string, limit = 100): LinkRow[] {
	return db
		.select()
		.from(link)
		.where(and(eq(link.userId, userId), eq(link.toRead, false)))
		.orderBy(desc(link.createdAt))
		.limit(limit)
		.all();
}
