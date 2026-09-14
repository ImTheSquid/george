import { IdResolver } from '@atproto/identity';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { actor } from '$lib/server/db/schema';

export const idResolver = new IdResolver();

/** Insert or refresh an actor row, resolving the handle from the DID document when not given. */
export async function upsertActor(did: string, handle?: string): Promise<void> {
	let h = handle;
	if (!h) {
		const doc = await idResolver.did.resolve(did);
		h = doc?.alsoKnownAs?.find((a) => a.startsWith('at://'))?.slice(5) ?? did;
	}
	const now = new Date().toISOString();
	db.insert(actor)
		.values({ did, handle: h, indexedAt: now })
		.onConflictDoUpdate({ target: actor.did, set: { handle: h, indexedAt: now } })
		.run();
}

export function getActor(did: string) {
	return db.select().from(actor).where(eq(actor.did, did)).get() ?? null;
}

export function getActorByHandle(handle: string) {
	return db.select().from(actor).where(eq(actor.handle, handle.toLowerCase())).get() ?? null;
}
