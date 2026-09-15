import { env } from '$env/dynamic/private';
import { ALL_COLLECTIONS, INSTANCE } from '@george/shared';

const appUrl = (env.APP_URL ?? INSTANCE.appUrl).replace(/\/$/, '');

export const config = {
	appUrl,
	pdsUrl: INSTANCE.pdsUrl,
	pdsHost: new URL(INSTANCE.pdsUrl).host,
	handleDomain: INSTANCE.handleDomain,
	databaseUrl: env.DATABASE_URL ?? 'data/george.db',
	oauthPrivateKeys: env.OAUTH_PRIVATE_KEYS ? (JSON.parse(env.OAUTH_PRIVATE_KEYS) as unknown[]) : [],
	indexer: env.INDEXER !== '0',
	/** OAuth scope string; default is granular per-collection access. */
	oauthScope: env.OAUTH_SCOPE || ['atproto', ...ALL_COLLECTIONS.map((c) => `repo:${c}`)].join(' '),
	/** Dev mode: atproto's special loopback OAuth client, no keys or metadata URL needed. */
	isLoopback: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appUrl)
};
