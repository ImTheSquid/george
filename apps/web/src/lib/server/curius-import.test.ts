import { beforeAll, describe, expect, it } from 'vitest';
import type { CuriusExport } from '@george/curius';

const me = { id: 1, firstName: 'Me', lastName: 'Myself', userLink: 'me-myself' };
const friend = { id: 2, firstName: 'Amber', lastName: 'Z', userLink: 'amber-z' };
const stranger = { id: 3, firstName: 'Ray', lastName: 'A', userLink: 'ray-a' };

const fixture: CuriusExport = {
	exportedAt: '2026-09-15T00:00:00Z',
	profile: { ...me, followingUsers: [friend, stranger] },
	links: [
		{
			id: 10,
			link: 'https://Example.com/post/?utm_source=x#frag',
			title: 'A post',
			favorite: true,
			snippet: 'About things',
			toRead: null,
			createdBy: 1,
			createdDate: '2026-01-02T03:04:05Z',
			modifiedDate: '2026-01-03T00:00:00Z',
			comments: [
				{ id: 50, userId: 1, user: me, parentId: null, text: 'link comment', createdDate: '2026-01-02T04:00:00Z', modifiedDate: '', replies: [] },
				{ id: 51, userId: 2, user: friend, parentId: null, text: 'not mine', createdDate: '2026-01-02T04:00:00Z', modifiedDate: '', replies: [] }
			],
			topics: [{ id: 1, userId: 1, topic: 'Systems', slug: 'systems', public: true }],
			highlights: [
				{
					id: 100, userId: 1, linkId: 10, highlight: 'the quote', createdDate: '2026-01-02T05:00:00Z',
					leftContext: 'before ', rightContext: ' after', rawHighlight: '',
					comment: {
						id: 60, userId: 1, user: me, parentId: null, text: 'nice', createdDate: '2026-01-02T05:01:00Z', modifiedDate: '',
						replies: [{ id: 61, userId: 1, user: me, parentId: 60, text: 'reply', createdDate: '2026-01-02T05:02:00Z', modifiedDate: '', replies: [] }]
					}
				}
			],
			userIds: [2]
		},
		{
			id: 11, link: 'chrome://bad', title: 'bad', favorite: false, snippet: '', toRead: true, createdBy: 1,
			createdDate: '2026-01-05T00:00:00Z', modifiedDate: '2026-01-05T00:00:00Z', comments: [], topics: [], highlights: [], userIds: []
		}
	]
};

describe('importExport', () => {
	let importExport: typeof import('./curius-import').importExport;
	let db: typeof import('./db').db;
	let schema: typeof import('./db/schema');
	let userId: string;
	let friendId: string;

	beforeAll(async () => {
		({ importExport } = await import('./curius-import'));
		({ db } = await import('./db'));
		schema = await import('./db/schema');
		const { config } = await import('./config');
		expect(config.databaseUrl).toBe(':memory:');
		const t = new Date().toISOString();
		userId = 'u1';
		friendId = 'u2';
		db.insert(schema.user).values({ id: userId, username: 'me', createdAt: t }).run();
		db.insert(schema.user).values({ id: friendId, username: 'amber', curiusUserLink: 'amber-z', createdAt: t }).run();
	});

	it('maps links, highlights, own comments, and friends', async () => {
		const r = await importExport(userId, fixture);
		expect(r).toMatchObject({ links: 1, highlights: 1, comments: 2, skipped: 1, followed: ['amber-z'] });
		expect(r.unmatched).toEqual([{ name: 'Ray A', userLink: 'ray-a' }]);

		const link = db.select().from(schema.link).get()!;
		expect(link.url).toBe('https://example.com/post');
		expect(link.tags).toEqual(['Systems']);
		expect(link.favorite).toBe(true);
		expect(link.createdAt).toBe('2026-01-02T03:04:05Z');

		const hl = db.select().from(schema.highlight).get()!;
		expect(hl).toMatchObject({ exact: 'the quote', prefix: 'before ', suffix: ' after', note: 'nice', linkId: link.id });

		const comments = db.select().from(schema.comment).all();
		expect(comments.map((c) => [c.subjectType, c.text]).sort()).toEqual([
			['highlight', 'reply'],
			['link', 'link comment']
		]);
	});

	it('is idempotent', async () => {
		const r = await importExport(userId, fixture);
		expect(r).toMatchObject({ links: 0, highlights: 0, comments: 0 });
		expect(db.select().from(schema.link).all()).toHaveLength(1);
		expect(db.select().from(schema.follow).all()).toHaveLength(1);
	});
});
