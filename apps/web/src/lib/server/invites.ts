import { count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invite, user } from '$lib/server/db/schema';
import { config } from '$lib/server/config';
import { newId, now } from '$lib/server/ids';

function newCode(): string {
	return `george-${newId(6).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

/** With no users yet, make sure one unused invite exists and print it, so the first account can be created. */
export function bootstrapInvite(): void {
	const users = db.select({ n: count() }).from(user).get()?.n ?? 0;
	if (users > 0 || !config.inviteRequired) return;
	let open = db.select().from(invite).where(isNull(invite.usedBy)).get();
	if (!open) {
		open = { code: newCode(), createdBy: null, usedBy: null, createdAt: now(), usedAt: null };
		db.insert(invite).values(open).run();
	}
	console.log(`[george] No users yet. Bootstrap invite code: ${open.code}`);
}

export function createInvite(createdBy: string): string {
	const code = newCode();
	db.insert(invite).values({ code, createdBy, createdAt: now() }).run();
	return code;
}

export function listInvites(createdBy?: string) {
	const q = db.select().from(invite).orderBy(desc(invite.createdAt));
	return (createdBy ? q.where(eq(invite.createdBy, createdBy)) : q).all();
}

/** Returns the invite row if `code` is valid and unused. */
export function checkInvite(code: string) {
	const row = db.select().from(invite).where(eq(invite.code, code.trim())).get();
	return row && !row.usedBy ? row : null;
}

export function consumeInvite(code: string, usedBy: string): void {
	db.update(invite).set({ usedBy, usedAt: now() }).where(eq(invite.code, code)).run();
}
