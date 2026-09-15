import { blob, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text().primaryKey(),
	username: text().notNull().unique(),
	displayName: text(),
	description: text(),
	website: text(),
	curiusUserLink: text(),
	isAdmin: integer({ mode: 'boolean' }).notNull().default(false),
	createdAt: text().notNull()
});

// WebAuthn credentials (passkeys). `id` is the base64url credential id.
export const credential = sqliteTable(
	'credential',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		publicKey: blob({ mode: 'buffer' }).notNull(),
		counter: integer().notNull().default(0),
		transports: text({ mode: 'json' }).$type<string[]>().notNull().default([]),
		deviceType: text(),
		backedUp: integer({ mode: 'boolean' }).notNull().default(false),
		name: text(),
		createdAt: text().notNull(),
		lastUsedAt: text()
	},
	(t) => [index('credential_user').on(t.userId)]
);

// Pending WebAuthn ceremonies, keyed by a short-lived cookie.
export const challenge = sqliteTable('challenge', {
	id: text().primaryKey(),
	challenge: text().notNull(),
	kind: text({ enum: ['signup', 'login'] }).notNull(),
	username: text(),
	inviteCode: text(),
	expiresAt: text().notNull()
});

export const invite = sqliteTable('invite', {
	code: text().primaryKey(),
	createdBy: text().references(() => user.id, { onDelete: 'set null' }),
	maxUses: integer().notNull().default(1),
	uses: integer().notNull().default(0),
	createdAt: text().notNull(),
	revokedAt: text()
});

export const inviteUse = sqliteTable('invite_use', {
	code: text()
		.notNull()
		.references(() => invite.code, { onDelete: 'cascade' }),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	usedAt: text().notNull()
});

// Bearer tokens for the browser extension. `hash` = sha256(token), base64url.
export const apiToken = sqliteTable('api_token', {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	hash: text().notNull().unique(),
	name: text().notNull(),
	createdAt: text().notNull(),
	lastUsedAt: text()
});

export const session = sqliteTable('session', {
	id: text().primaryKey(),
	userId: text()
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: text().notNull(),
	lastSeenAt: text().notNull()
});

export const link = sqliteTable(
	'link',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		url: text().notNull(),
		urlHash: text().notNull(),
		title: text(),
		description: text(),
		toRead: integer({ mode: 'boolean' }).notNull().default(false),
		favorite: integer({ mode: 'boolean' }).notNull().default(false),
		tags: text({ mode: 'json' }).$type<string[]>().notNull().default([]),
		createdAt: text().notNull(),
		updatedAt: text().notNull()
	},
	(t) => [
		uniqueIndex('link_user_url').on(t.userId, t.urlHash),
		index('link_url_hash').on(t.urlHash),
		index('link_created').on(t.createdAt)
	]
);

export const highlight = sqliteTable(
	'highlight',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		linkId: text().references(() => link.id, { onDelete: 'set null' }),
		url: text().notNull(),
		urlHash: text().notNull(),
		exact: text().notNull(),
		prefix: text(),
		suffix: text(),
		start: integer(),
		end: integer(),
		note: text(),
		createdAt: text().notNull()
	},
	(t) => [
		index('highlight_url_hash').on(t.urlHash),
		index('highlight_user').on(t.userId),
		index('highlight_created').on(t.createdAt)
	]
);

export const comment = sqliteTable(
	'comment',
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		subjectType: text({ enum: ['link', 'highlight', 'comment'] }).notNull(),
		subjectId: text().notNull(),
		text: text().notNull(),
		createdAt: text().notNull()
	},
	(t) => [index('comment_subject').on(t.subjectType, t.subjectId)]
);

export const follow = sqliteTable(
	'follow',
	{
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		subjectId: text()
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: text().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.subjectId] }), index('follow_subject').on(t.subjectId)]
);
