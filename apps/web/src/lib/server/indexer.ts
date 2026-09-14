import { Firehose, MemoryRunner, type Event } from '@atproto/sync';
import { eq } from 'drizzle-orm';
import { COLLECTIONS, ALL_COLLECTIONS, normalizeUrl, urlHash } from '@george/shared';
import * as Link from '@george/lexicon/types/me/jackhogan/george/link';
import * as Highlight from '@george/lexicon/types/me/jackhogan/george/highlight';
import * as Comment from '@george/lexicon/types/me/jackhogan/george/comment';
import * as Follow from '@george/lexicon/types/me/jackhogan/george/follow';
import * as Profile from '@george/lexicon/types/me/jackhogan/george/profile';
import { config } from '$lib/server/config';
import { db } from '$lib/server/db';
import { actor, comment, follow, highlight, kv, link } from '$lib/server/db/schema';
import { idResolver, upsertActor } from '$lib/server/actors';

const CURSOR_KEY = 'firehose_cursor';

function getCursor(): number {
	const row = db.select().from(kv).where(eq(kv.key, CURSOR_KEY)).get();
	return row ? Number(row.value) : 0;
}

async function setCursor(cursor: number): Promise<void> {
	db.insert(kv)
		.values({ key: CURSOR_KEY, value: String(cursor) })
		.onConflictDoUpdate({ target: kv.key, set: { value: String(cursor) } })
		.run();
}

let firehose: Firehose | undefined;

export function startIndexer(): void {
	if (firehose) return;
	// Tranquil rejects an empty `cursor=` param, so always start from a number.
	const runner = new MemoryRunner({ startCursor: getCursor(), setCursor });
	firehose = new Firehose({
		service: config.pdsUrl.replace(/^http/, 'ws'),
		idResolver,
		runner,
		filterCollections: ALL_COLLECTIONS,
		handleEvent,
		onError: (err) => console.error('[indexer]', err.message, err.cause ?? '')
	});
	firehose.start();
	console.log('[indexer] started at cursor', getCursor());
}

export async function handleEvent(evt: Event): Promise<void> {
	switch (evt.event) {
		case 'identity':
			await upsertActor(evt.did, evt.handle);
			return;
		case 'account':
			db.update(actor).set({ active: evt.active }).where(eq(actor.did, evt.did)).run();
			return;
		case 'sync':
			return;
		case 'create':
		case 'update':
			await ensureActor(evt.did);
			await indexRecord(evt.did, evt.collection, evt.uri.toString(), evt.cid.toString(), evt.record, evt.time);
			return;
		case 'delete':
			deleteRecord(evt.collection, evt.uri.toString());
			return;
	}
}

async function ensureActor(did: string): Promise<void> {
	const exists = db.select({ did: actor.did }).from(actor).where(eq(actor.did, did)).get();
	if (!exists) await upsertActor(did);
}

/** Index one record. Shared by the firehose and by optimistic local writes. */
export async function indexRecord(
	did: string,
	collection: string,
	uri: string,
	cid: string,
	record: unknown,
	indexedAt = new Date().toISOString()
): Promise<void> {
	switch (collection) {
		case COLLECTIONS.link: {
			const v = Link.validateRecord(record);
			if (!v.success) return warn(uri, v.error);
			const r = v.value;
			const url = safeNormalize(r.url);
			if (!url) return;
			const row = {
				uri,
				cid,
				did,
				url,
				urlHash: await urlHash(url),
				title: r.title ?? null,
				description: r.description ?? null,
				toRead: r.toRead ?? false,
				favorite: r.favorite ?? false,
				tags: r.tags ?? [],
				createdAt: r.createdAt,
				indexedAt
			};
			db.insert(link).values(row).onConflictDoUpdate({ target: link.uri, set: row }).run();
			return;
		}
		case COLLECTIONS.highlight: {
			const v = Highlight.validateRecord(record);
			if (!v.success) return warn(uri, v.error);
			const r = v.value;
			const url = safeNormalize(r.url);
			if (!url) return;
			const row = {
				uri,
				cid,
				did,
				url,
				urlHash: await urlHash(url),
				linkUri: r.link?.uri ?? null,
				exact: r.selector.exact,
				prefix: r.selector.prefix ?? null,
				suffix: r.selector.suffix ?? null,
				start: r.position?.start ?? null,
				end: r.position?.end ?? null,
				note: r.note ?? null,
				createdAt: r.createdAt,
				indexedAt
			};
			db.insert(highlight).values(row).onConflictDoUpdate({ target: highlight.uri, set: row }).run();
			return;
		}
		case COLLECTIONS.comment: {
			const v = Comment.validateRecord(record);
			if (!v.success) return warn(uri, v.error);
			const r = v.value;
			const row = { uri, cid, did, subjectUri: r.subject.uri, text: r.text, createdAt: r.createdAt, indexedAt };
			db.insert(comment).values(row).onConflictDoUpdate({ target: comment.uri, set: row }).run();
			return;
		}
		case COLLECTIONS.follow: {
			const v = Follow.validateRecord(record);
			if (!v.success) return warn(uri, v.error);
			const r = v.value;
			const row = { uri, did, subjectDid: r.subject, createdAt: r.createdAt };
			db.insert(follow).values(row).onConflictDoUpdate({ target: follow.uri, set: row }).run();
			return;
		}
		case COLLECTIONS.profile: {
			const v = Profile.validateRecord(record);
			if (!v.success) return warn(uri, v.error);
			const r = v.value;
			db.update(actor)
				.set({
					displayName: r.displayName ?? null,
					description: r.description ?? null,
					website: r.website ?? null,
					curiusUserLink: r.curiusUserLink ?? null
				})
				.where(eq(actor.did, did))
				.run();
			return;
		}
	}
}

export function deleteRecord(collection: string, uri: string): void {
	switch (collection) {
		case COLLECTIONS.link:
			db.delete(link).where(eq(link.uri, uri)).run();
			return;
		case COLLECTIONS.highlight:
			db.delete(highlight).where(eq(highlight.uri, uri)).run();
			return;
		case COLLECTIONS.comment:
			db.delete(comment).where(eq(comment.uri, uri)).run();
			return;
		case COLLECTIONS.follow:
			db.delete(follow).where(eq(follow.uri, uri)).run();
			return;
	}
}

function safeNormalize(url: string): string | null {
	try {
		return normalizeUrl(url);
	} catch {
		return null;
	}
}

function warn(uri: string, err: unknown): void {
	console.warn('[indexer] invalid record', uri, err instanceof Error ? err.message : err);
}
