import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Index of records seen on the firehose. `uri` is the at:// URI of the record.

export const actor = sqliteTable('actor', {
	did: text().primaryKey(),
	handle: text().notNull(),
	displayName: text(),
	description: text(),
	website: text(),
	curiusUserLink: text(),
	active: integer({ mode: 'boolean' }).notNull().default(true),
	indexedAt: text().notNull()
});

export const link = sqliteTable(
	'link',
	{
		uri: text().primaryKey(),
		cid: text().notNull(),
		did: text().notNull(),
		url: text().notNull(),
		urlHash: text().notNull(),
		title: text(),
		description: text(),
		toRead: integer({ mode: 'boolean' }).notNull().default(false),
		favorite: integer({ mode: 'boolean' }).notNull().default(false),
		tags: text({ mode: 'json' }).$type<string[]>().notNull().default([]),
		createdAt: text().notNull(),
		indexedAt: text().notNull()
	},
	(t) => [
		index('link_did_url').on(t.did, t.urlHash),
		index('link_url_hash').on(t.urlHash),
		index('link_created').on(t.createdAt)
	]
);

export const highlight = sqliteTable(
	'highlight',
	{
		uri: text().primaryKey(),
		cid: text().notNull(),
		did: text().notNull(),
		url: text().notNull(),
		urlHash: text().notNull(),
		linkUri: text(),
		exact: text().notNull(),
		prefix: text(),
		suffix: text(),
		start: integer(),
		end: integer(),
		note: text(),
		createdAt: text().notNull(),
		indexedAt: text().notNull()
	},
	(t) => [
		index('highlight_url_hash').on(t.urlHash),
		index('highlight_did').on(t.did),
		index('highlight_created').on(t.createdAt)
	]
);

export const comment = sqliteTable(
	'comment',
	{
		uri: text().primaryKey(),
		cid: text().notNull(),
		did: text().notNull(),
		subjectUri: text().notNull(),
		text: text().notNull(),
		createdAt: text().notNull(),
		indexedAt: text().notNull()
	},
	(t) => [index('comment_subject').on(t.subjectUri)]
);

export const follow = sqliteTable(
	'follow',
	{
		uri: text().primaryKey(),
		did: text().notNull(),
		subjectDid: text().notNull(),
		createdAt: text().notNull()
	},
	(t) => [uniqueIndex('follow_did_subject').on(t.did, t.subjectDid), index('follow_subject').on(t.subjectDid)]
);

// App login sessions (cookie id -> did)
export const session = sqliteTable('session', {
	id: text().primaryKey(),
	did: text().notNull(),
	createdAt: text().notNull(),
	lastSeenAt: text().notNull()
});

// Stores for @atproto/oauth-client-node
export const oauthState = sqliteTable('oauth_state', {
	key: text().primaryKey(),
	value: text().notNull()
});

export const oauthSession = sqliteTable('oauth_session', {
	did: text().primaryKey(),
	value: text().notNull()
});

export const kv = sqliteTable('kv', {
	key: text().primaryKey(),
	value: text().notNull()
});
