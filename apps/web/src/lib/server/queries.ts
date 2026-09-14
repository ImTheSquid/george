import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { actor, follow, highlight, link } from '$lib/server/db/schema';

export type ActorRow = typeof actor.$inferSelect;
export type LinkRow = typeof link.$inferSelect;
export type HighlightRow = typeof highlight.$inferSelect;

export type FeedItem =
	| { kind: 'link'; actor: ActorRow; link: LinkRow; createdAt: string }
	| { kind: 'highlight'; actor: ActorRow; highlight: HighlightRow; createdAt: string };

export function listMyLinks(did: string, opts: { toRead?: boolean; limit?: number } = {}): LinkRow[] {
	const conds = [eq(link.did, did)];
	if (opts.toRead !== undefined) conds.push(eq(link.toRead, opts.toRead));
	return db
		.select()
		.from(link)
		.where(and(...conds))
		.orderBy(desc(link.createdAt))
		.limit(opts.limit ?? 200)
		.all();
}

export function getFollowingDids(did: string): string[] {
	return db
		.select({ subjectDid: follow.subjectDid })
		.from(follow)
		.where(eq(follow.did, did))
		.all()
		.map((r) => r.subjectDid);
}

export function isFollowing(did: string, subjectDid: string): boolean {
	return !!db
		.select({ uri: follow.uri })
		.from(follow)
		.where(and(eq(follow.did, did), eq(follow.subjectDid, subjectDid)))
		.get();
}

/** Newest links and highlights from the accounts `did` follows. */
export function getFeed(did: string, limit = 100): FeedItem[] {
	const dids = getFollowingDids(did);
	if (dids.length === 0) return [];
	const links = db
		.select({ link, actor })
		.from(link)
		.innerJoin(actor, eq(actor.did, link.did))
		.where(inArray(link.did, dids))
		.orderBy(desc(link.createdAt))
		.limit(limit)
		.all();
	const highlights = db
		.select({ highlight, actor })
		.from(highlight)
		.innerJoin(actor, eq(actor.did, highlight.did))
		.where(inArray(highlight.did, dids))
		.orderBy(desc(highlight.createdAt))
		.limit(limit)
		.all();
	const items: FeedItem[] = [
		...links.map((r) => ({ kind: 'link' as const, actor: r.actor, link: r.link, createdAt: r.link.createdAt })),
		...highlights.map((r) => ({
			kind: 'highlight' as const,
			actor: r.actor,
			highlight: r.highlight,
			createdAt: r.highlight.createdAt
		}))
	];
	items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
	return items.slice(0, limit);
}

export function listActors(limit = 500): ActorRow[] {
	return db.select().from(actor).where(eq(actor.active, true)).orderBy(actor.handle).limit(limit).all();
}

export function listLinksBy(did: string, limit = 100): LinkRow[] {
	return db
		.select()
		.from(link)
		.where(and(eq(link.did, did), eq(link.toRead, false)))
		.orderBy(desc(link.createdAt))
		.limit(limit)
		.all();
}
