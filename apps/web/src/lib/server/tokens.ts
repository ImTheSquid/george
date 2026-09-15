import { createHash } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apiToken } from '$lib/server/db/schema';
import { newId, now } from '$lib/server/ids';

const PREFIX = 'grg_';

function hash(token: string): string {
	return createHash('sha256').update(token).digest('base64url');
}

/** Mint a token; the plaintext is returned once and never stored. */
export function createToken(userId: string, name: string): string {
	const token = PREFIX + newId(32);
	db.insert(apiToken).values({ id: newId(), userId, hash: hash(token), name, createdAt: now() }).run();
	return token;
}

export function verifyToken(token: string): string | null {
	if (!token.startsWith(PREFIX)) return null;
	const row = db.select().from(apiToken).where(eq(apiToken.hash, hash(token))).get();
	if (!row) return null;
	db.update(apiToken).set({ lastUsedAt: now() }).where(eq(apiToken.id, row.id)).run();
	return row.userId;
}

export function listTokens(userId: string) {
	return db
		.select({ id: apiToken.id, name: apiToken.name, createdAt: apiToken.createdAt, lastUsedAt: apiToken.lastUsedAt })
		.from(apiToken)
		.where(eq(apiToken.userId, userId))
		.orderBy(desc(apiToken.createdAt))
		.all();
}

export function revokeToken(userId: string, id: string): void {
	db.delete(apiToken).where(and(eq(apiToken.id, id), eq(apiToken.userId, userId))).run();
}
