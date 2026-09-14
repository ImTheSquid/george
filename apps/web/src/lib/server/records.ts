// Write records to the user's repo via their OAuth session, then index them
// locally so the UI reflects the change before the firehose echoes it back.
import { and, eq } from 'drizzle-orm';
import { COLLECTIONS, normalizeUrl, urlHash } from '@george/shared';
import * as Link from '@george/lexicon/types/me/jackhogan/george/link';
import * as Follow from '@george/lexicon/types/me/jackhogan/george/follow';
import * as Profile from '@george/lexicon/types/me/jackhogan/george/profile';
import { db } from '$lib/server/db';
import { follow, link } from '$lib/server/db/schema';
import { agentFor } from '$lib/server/oauth';
import { deleteRecord, indexRecord } from '$lib/server/indexer';

export class NotLoggedIn extends Error {}

function rkeyOf(uri: string): string {
	return uri.slice(uri.lastIndexOf('/') + 1);
}

async function agentOrThrow(did: string) {
	const agent = await agentFor(did);
	if (!agent) throw new NotLoggedIn('no OAuth session; log in again');
	return agent;
}

export type LinkInput = {
	url: string;
	title?: string;
	description?: string;
	toRead?: boolean;
	favorite?: boolean;
	tags?: string[];
};

/** Create the user's link record for a URL, or update the existing one. Returns the record URI. */
export async function saveLink(did: string, input: LinkInput): Promise<string> {
	const url = normalizeUrl(input.url);
	const existing = db
		.select()
		.from(link)
		.where(and(eq(link.did, did), eq(link.urlHash, await urlHash(url))))
		.get();

	const record: Link.Record = {
		$type: COLLECTIONS.link,
		url,
		title: input.title ?? existing?.title ?? undefined,
		description: input.description ?? existing?.description ?? undefined,
		toRead: input.toRead ?? existing?.toRead ?? false,
		favorite: input.favorite ?? existing?.favorite ?? false,
		tags: input.tags ?? existing?.tags ?? [],
		createdAt: existing?.createdAt ?? new Date().toISOString()
	};
	const v = Link.validateRecord(record);
	if (!v.success) throw v.error;

	const agent = await agentOrThrow(did);
	const res = existing
		? await agent.com.atproto.repo.putRecord({
				repo: did,
				collection: COLLECTIONS.link,
				rkey: rkeyOf(existing.uri),
				record
			})
		: await agent.com.atproto.repo.createRecord({ repo: did, collection: COLLECTIONS.link, record });
	await indexRecord(did, COLLECTIONS.link, res.data.uri, res.data.cid, record);
	return res.data.uri;
}

export async function deleteLink(did: string, uri: string): Promise<void> {
	const row = db.select().from(link).where(and(eq(link.uri, uri), eq(link.did, did))).get();
	if (!row) return;
	const agent = await agentOrThrow(did);
	await agent.com.atproto.repo.deleteRecord({ repo: did, collection: COLLECTIONS.link, rkey: rkeyOf(uri) });
	deleteRecord(COLLECTIONS.link, uri);
}

export async function followActor(did: string, subjectDid: string): Promise<void> {
	if (did === subjectDid) return;
	const existing = db
		.select()
		.from(follow)
		.where(and(eq(follow.did, did), eq(follow.subjectDid, subjectDid)))
		.get();
	if (existing) return;
	const record: Follow.Record = { $type: COLLECTIONS.follow, subject: subjectDid, createdAt: new Date().toISOString() };
	const agent = await agentOrThrow(did);
	const res = await agent.com.atproto.repo.createRecord({ repo: did, collection: COLLECTIONS.follow, record });
	await indexRecord(did, COLLECTIONS.follow, res.data.uri, res.data.cid, record);
}

export async function unfollowActor(did: string, subjectDid: string): Promise<void> {
	const existing = db
		.select()
		.from(follow)
		.where(and(eq(follow.did, did), eq(follow.subjectDid, subjectDid)))
		.get();
	if (!existing) return;
	const agent = await agentOrThrow(did);
	await agent.com.atproto.repo.deleteRecord({ repo: did, collection: COLLECTIONS.follow, rkey: rkeyOf(existing.uri) });
	deleteRecord(COLLECTIONS.follow, existing.uri);
}

export async function putProfile(did: string, input: Omit<Profile.Record, '$type'>): Promise<void> {
	const record: Profile.Record = { $type: COLLECTIONS.profile, ...input };
	const v = Profile.validateRecord(record);
	if (!v.success) throw v.error;
	const agent = await agentOrThrow(did);
	const res = await agent.com.atproto.repo.putRecord({ repo: did, collection: COLLECTIONS.profile, rkey: 'self', record });
	await indexRecord(did, COLLECTIONS.profile, res.data.uri, res.data.cid, record);
}
