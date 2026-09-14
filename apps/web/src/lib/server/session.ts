import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { config } from '$lib/server/config';

export const SESSION_COOKIE = 'george_sid';
const MAX_AGE_S = 30 * 24 * 3600;

export function createSession(cookies: Cookies, did: string): void {
	const id = randomBytes(32).toString('base64url');
	const now = new Date().toISOString();
	db.insert(session).values({ id, did, createdAt: now, lastSeenAt: now }).run();
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !config.isLoopback,
		maxAge: MAX_AGE_S
	});
}

export function getSessionDid(id: string): string | null {
	const row = db.select({ did: session.did }).from(session).where(eq(session.id, id)).get();
	return row?.did ?? null;
}

export function destroySession(cookies: Cookies): void {
	const id = cookies.get(SESSION_COOKIE);
	if (id) db.delete(session).where(eq(session.id, id)).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
