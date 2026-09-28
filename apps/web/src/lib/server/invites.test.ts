import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

let db: typeof import('./db').db;
let s: typeof import('./db/schema');
let inv: typeof import('./invites');
let rec: typeof import('./records');
let config: typeof import('./config').config;

const t = '2026-01-01T00:00:00Z';

function addUser(id: string, extra: { isAdmin?: boolean; inviteQuota?: number | null } = {}) {
	db.insert(s.user).values({ id, username: id, createdAt: t, ...extra }).run();
}

/** `inviterId` creates a code and `id` signs up with it. */
function invitedBy(inviterId: string, id: string) {
	const code = inv.createInvite(inviterId, 1);
	addUser(id);
	inv.consumeInvite(code, id);
}

function addLink(id: string, userId: string) {
	db.insert(s.link).values({ id, userId, url: `https://x/${id}`, urlHash: id, createdAt: t, updatedAt: t }).run();
}

function addComment(id: string, userId: string, subjectType: 'link' | 'highlight' | 'comment', subjectId: string) {
	db.insert(s.comment).values({ id, userId, subjectType, subjectId, text: id, createdAt: t }).run();
}

const commentIds = () => db.select({ id: s.comment.id }).from(s.comment).all().map((c) => c.id).sort();
const eqId = (id: string) => eq(s.user.id, id);
const userIds = () => db.select({ id: s.user.id }).from(s.user).all().map((u) => u.id).sort();

beforeAll(async () => {
	({ db } = await import('./db'));
	s = await import('./db/schema');
	inv = await import('./invites');
	rec = await import('./records');
	({ config } = await import('./config'));
	expect(config.databaseUrl).toBe(':memory:');
});

beforeEach(() => {
	db.delete(s.comment).run();
	db.delete(s.invite).run();
	db.delete(s.user).run();
	config.inviteRequired = true;
	config.inviteQuotaDefault = 2;
	addUser('admin', { isAdmin: true });
});

describe('invite allowance', () => {
	it('uses the default unless overridden', () => {
		addUser('a');
		addUser('b', { inviteQuota: 5 });
		addUser('c', { inviteQuota: 0 });
		const get = (id: string) => inv.inviteAllowance(db.select().from(s.user).where(eqId(id)).get()!);
		expect(get('a')).toEqual({ quota: 2, used: 0, remaining: 2 });
		expect(get('b').quota).toBe(5);
		expect(get('c').quota).toBe(0);
		expect(inv.createUserInvite('c')).toBeNull();
	});

	it('stops at the quota and refunds unused revoked codes only', () => {
		addUser('a');
		const first = inv.createUserInvite('a')!;
		const second = inv.createUserInvite('a')!;
		expect(inv.createUserInvite('a')).toBeNull();

		inv.revokeInvite(first, 'a');
		expect(inv.invitesUsed('a')).toBe(1);
		expect(inv.createUserInvite('a')).not.toBeNull();

		addUser('b');
		inv.consumeInvite(second, 'b');
		inv.revokeInvite(second, 'a');
		expect(inv.invitesUsed('a')).toBe(2);
		expect(inv.createUserInvite('a')).toBeNull();
	});

	it('makes single-use codes', () => {
		addUser('a');
		const code = inv.createUserInvite('a')!;
		expect(inv.checkInvite(code)?.maxUses).toBe(1);
	});

	it("only lets owners revoke their codes", () => {
		addUser('a');
		addUser('b');
		const code = inv.createUserInvite('a')!;
		inv.revokeInvite(code, 'b');
		expect(inv.checkInvite(code)).not.toBeNull();
	});

	it('treats admins as unlimited', () => {
		expect(inv.inviteAllowance({ id: 'admin', isAdmin: true, inviteQuota: 0 }).remaining).toBeNull();
		for (let i = 0; i < 5; i++) expect(inv.createUserInvite('admin')).not.toBeNull();
	});

	it('is off when invites are not required', () => {
		addUser('a');
		config.inviteRequired = false;
		expect(inv.createUserInvite('a')).toBeNull();
	});

	it('bulk revoke touches only active codes', () => {
		addUser('a', { inviteQuota: 3 });
		const used = inv.createUserInvite('a')!;
		addUser('b');
		inv.consumeInvite(used, 'b');
		const open = inv.createUserInvite('a')!;
		inv.revokeAllInvitesBy('a');
		const rows = Object.fromEntries(inv.listInvites('a').map((r) => [r.code, r.status]));
		expect(rows).toEqual({ [used]: 'exhausted', [open]: 'revoked' });
		expect(inv.invitesUsed('a')).toBe(1);
	});
});

describe('no orphan comments', () => {
	it('deleting a link removes its comments and nested replies', () => {
		addUser('a');
		addUser('b');
		addLink('l1', 'a');
		addLink('l2', 'a');
		addComment('c1', 'b', 'link', 'l1');
		addComment('c2', 'a', 'comment', 'c1');
		addComment('c3', 'b', 'comment', 'c2');
		addComment('keep', 'b', 'link', 'l2');
		rec.deleteLink('a', 'l1');
		expect(commentIds()).toEqual(['keep']);
	});

	it("deleting a user removes others' comments on their content", () => {
		addUser('a');
		addUser('b');
		addLink('l1', 'a');
		addLink('l2', 'b');
		addComment('on-a', 'b', 'link', 'l1');
		addComment('by-a', 'a', 'link', 'l2');
		addComment('reply-to-a', 'b', 'comment', 'by-a');
		addComment('keep', 'b', 'link', 'l2');
		expect(rec.deleteUsers('a', false)).toEqual({ deleted: ['a'] });
		expect(commentIds()).toEqual(['keep']);
	});
});

describe('deleteUsers', () => {
	beforeEach(() => {
		// admin → a → b → c, and a → d; e is unrelated
		invitedBy('admin', 'a');
		invitedBy('a', 'b');
		invitedBy('b', 'c');
		invitedBy('a', 'd');
		invitedBy('admin', 'e');
	});

	it('computes the invite tree', () => {
		expect(inv.inviteTree('a').map((u) => u.username)).toEqual(['b', 'c', 'd']);
		expect(inv.inviteTree('c')).toEqual([]);
	});

	it('deletes only the root without invitees', () => {
		const open = inv.createInvite('a', 1);
		rec.deleteUsers('a', false);
		expect(userIds()).toEqual(['admin', 'b', 'c', 'd', 'e']);
		expect(inv.checkInvite(open)).toBeNull();
	});

	it('deletes the whole tree with invitees', () => {
		expect(rec.deleteUsers('a', true)).toEqual({ deleted: expect.arrayContaining(['a', 'b', 'c', 'd']) });
		expect(userIds()).toEqual(['admin', 'e']);
	});

	it('cascades sessions and tokens', () => {
		db.insert(s.session).values({ id: 's1', userId: 'a', createdAt: t, lastSeenAt: t }).run();
		db.insert(s.apiToken).values({ id: 't1', userId: 'a', hash: 'h', name: 'x', createdAt: t }).run();
		rec.deleteUsers('a', false);
		expect(db.select().from(s.session).all()).toEqual([]);
		expect(db.select().from(s.apiToken).all()).toEqual([]);
	});

	it('refuses admins, including inside the tree', () => {
		expect(rec.deleteUsers('admin', false)).toEqual({ error: 'admin is an admin' });
		db.update(s.user).set({ isAdmin: true }).where(eqId('c')).run();
		expect(rec.deleteUsers('a', true)).toEqual({ error: 'c is an admin' });
		expect(userIds()).toHaveLength(6);
	});
});
