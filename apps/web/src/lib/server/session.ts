import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { config } from '$lib/server/config';
import { newId, now } from '$lib/server/ids';

export const SESSION_COOKIE = 'george_sid';
const MAX_AGE_S = 90 * 24 * 3600;

export function createSession(cookies: Cookies, userId: string): void {
	const id = newId(32);
	const t = now();
	db.insert(session).values({ id, userId, createdAt: t, lastSeenAt: t }).run();
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !config.isDev,
		maxAge: MAX_AGE_S
	});
}

export function getSessionUserId(id: string): string | null {
	const row = db.select({ userId: session.userId }).from(session).where(eq(session.id, id)).get();
	return row?.userId ?? null;
}

export function destroySession(cookies: Cookies): void {
	const id = cookies.get(SESSION_COOKIE);
	if (id) db.delete(session).where(eq(session.id, id)).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
