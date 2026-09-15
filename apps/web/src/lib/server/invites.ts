import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invite, inviteUse, user } from '$lib/server/db/schema';
import { config } from '$lib/server/config';
import { newId, now } from '$lib/server/ids';

function newCode(): string {
	return `george-${newId(6).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

/** With no users yet, make sure one usable invite exists and print it, so the first account can be created. */
export function bootstrapInvite(): void {
	const users = db.select({ n: count() }).from(user).get()?.n ?? 0;
	if (users > 0 || !config.inviteRequired) return;
	let open = db
		.select()
		.from(invite)
		.where(and(isNull(invite.revokedAt), sql`${invite.uses} < ${invite.maxUses}`))
		.get();
	if (!open) {
		const code = newCode();
		db.insert(invite).values({ code, createdAt: now() }).run();
		open = db.select().from(invite).where(eq(invite.code, code)).get()!;
	}
	console.log(`[george] No users yet. Bootstrap invite code: ${open.code}`);
}

export function createInvite(createdBy: string, maxUses = 1): string {
	const code = newCode();
	db.insert(invite).values({ code, createdBy, maxUses: Math.max(1, Math.floor(maxUses)), createdAt: now() }).run();
	return code;
}

export function revokeInvite(code: string): void {
	db.update(invite).set({ revokedAt: now() }).where(eq(invite.code, code)).run();
}

export function listInvites() {
	const rows = db.select().from(invite).orderBy(desc(invite.createdAt)).all();
	const uses = db
		.select({ code: inviteUse.code, username: user.username, usedAt: inviteUse.usedAt })
		.from(inviteUse)
		.innerJoin(user, eq(user.id, inviteUse.userId))
		.all();
	return rows.map((r) => ({
		...r,
		usedBy: uses.filter((u) => u.code === r.code).map((u) => u.username),
		status: r.revokedAt ? ('revoked' as const) : r.uses >= r.maxUses ? ('exhausted' as const) : ('active' as const)
	}));
}

/** Returns the invite row if `code` can still be used. */
export function checkInvite(code: string) {
	const row = db.select().from(invite).where(eq(invite.code, code.trim())).get();
	return row && !row.revokedAt && row.uses < row.maxUses ? row : null;
}

export function consumeInvite(code: string, userId: string): void {
	db.update(invite)
		.set({ uses: sql`${invite.uses} + 1` })
		.where(eq(invite.code, code))
		.run();
	db.insert(inviteUse).values({ code, userId, usedAt: now() }).run();
}
