import { and, count, desc, eq, inArray, isNotNull, isNull, lt, not, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invite, inviteUse, user } from '$lib/server/db/schema';
import { config } from '$lib/server/config';
import { newId, now } from '$lib/server/ids';

type Inviter = { id: string; isAdmin: boolean; inviteQuota: number | null };

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

export function effectiveQuota(u: Pick<Inviter, 'inviteQuota'>): number {
	return u.inviteQuota ?? config.inviteQuotaDefault;
}

export function canInvite(u: Inviter): boolean {
	return config.inviteRequired && (u.isAdmin || effectiveQuota(u) > 0);
}

/** Codes counted against their creator: all but revoked codes nobody used. */
export function invitesUsed(userId: string): number {
	return (
		db
			.select({ n: count() })
			.from(invite)
			.where(and(eq(invite.createdBy, userId), not(and(isNotNull(invite.revokedAt), eq(invite.uses, 0))!)))
			.get()?.n ?? 0
	);
}

/** `quota` and `remaining` are null for admins, who are unlimited. */
export function inviteAllowance(u: Inviter) {
	const used = invitesUsed(u.id);
	if (u.isAdmin) return { quota: null, used, remaining: null };
	const quota = effectiveQuota(u);
	return { quota, used, remaining: Math.max(0, quota - used) };
}

/** Creates a single-use code against the user's allowance; null when none is left. */
export function createUserInvite(userId: string): string | null {
	return db.transaction(() => {
		const u = db.select().from(user).where(eq(user.id, userId)).get();
		if (!u || !canInvite(u) || inviteAllowance(u).remaining === 0) return null;
		return createInvite(userId, 1);
	});
}

/** With `ownerId`, only revokes that user's own code. */
export function revokeInvite(code: string, ownerId?: string): void {
	db.update(invite)
		.set({ revokedAt: now() })
		.where(and(eq(invite.code, code), isNull(invite.revokedAt), ownerId ? eq(invite.createdBy, ownerId) : undefined))
		.run();
}

export function revokeAllInvitesBy(userId: string): void {
	db.update(invite)
		.set({ revokedAt: now() })
		.where(and(eq(invite.createdBy, userId), isNull(invite.revokedAt), lt(invite.uses, invite.maxUses)))
		.run();
}

export function setInviteQuota(userId: string, quota: number | null): void {
	db.update(user).set({ inviteQuota: quota }).where(eq(user.id, userId)).run();
}

export function listInvites(createdBy?: string) {
	const rows = db
		.select()
		.from(invite)
		.where(createdBy ? eq(invite.createdBy, createdBy) : undefined)
		.orderBy(desc(invite.createdAt))
		.all();
	const uses = db
		.select({ code: inviteUse.code, username: user.username, usedAt: inviteUse.usedAt })
		.from(inviteUse)
		.innerJoin(user, eq(user.id, inviteUse.userId))
		.where(inArray(inviteUse.code, rows.length ? rows.map((r) => r.code) : ['']))
		.all();
	return rows.map((r) => ({
		...r,
		usedBy: uses.filter((u) => u.code === r.code).map((u) => u.username),
		status: r.revokedAt ? ('revoked' as const) : r.uses >= r.maxUses ? ('exhausted' as const) : ('active' as const)
	}));
}

/** Everyone who signed up through `rootId`'s codes, through theirs, and so on. */
export function inviteTree(rootId: string): { id: string; username: string }[] {
	return db.all(sql`
		WITH RECURSIVE tree(id) AS (
			SELECT iu.user_id FROM invite_use iu JOIN invite i ON i.code = iu.code WHERE i.created_by = ${rootId}
			UNION
			SELECT iu.user_id FROM invite_use iu JOIN invite i ON i.code = iu.code JOIN tree t ON i.created_by = t.id
		)
		SELECT u.id, u.username FROM tree JOIN "user" u ON u.id = tree.id WHERE u.id != ${rootId} ORDER BY u.username
	`);
}

/** Admin view: every user with their allowance and invite tree. */
export function listInviters() {
	return db
		.select({ id: user.id, username: user.username, isAdmin: user.isAdmin, inviteQuota: user.inviteQuota })
		.from(user)
		.orderBy(user.username)
		.all()
		.map((u) => ({ ...u, ...inviteAllowance(u), invitees: inviteTree(u.id).map((t) => t.username) }));
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
