import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { follow, highlight, link, user } from '$lib/server/db/schema';

export type UserRow = typeof user.$inferSelect;
export type LinkRow = typeof link.$inferSelect;
export type HighlightRow = typeof highlight.$inferSelect;

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
};

/** One page as seen by `userId`: their own link, followed users' links, and all of those users' highlights. */
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
	return {
		mine: links.find((r) => r.link.userId === userId)?.link ?? null,
		friends: links.filter((r) => r.link.userId !== userId),
		highlights: highlights.map((r) => ({ ...r, mine: r.highlight.userId === userId }))
	};
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
