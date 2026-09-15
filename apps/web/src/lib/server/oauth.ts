import { Agent } from '@atproto/api';
import { JoseKey } from '@atproto/jwk-jose';
import {
	NodeOAuthClient,
	type NodeSavedSession,
	type NodeSavedState,
	type OAuthClientMetadataInput
} from '@atproto/oauth-client-node';
import { eq } from 'drizzle-orm';
import { config } from '$lib/server/config';
import { db } from '$lib/server/db';
import { oauthSession, oauthState } from '$lib/server/db/schema';

export const SCOPE = config.oauthScope;

const redirectUri = `${config.appUrl}/oauth/callback`;

export function clientMetadata(): OAuthClientMetadataInput {
	const common = {
		client_name: 'george',
		client_uri: config.appUrl,
		redirect_uris: [redirectUri] as [string],
		scope: SCOPE,
		grant_types: ['authorization_code', 'refresh_token'] as ['authorization_code', 'refresh_token'],
		response_types: ['code'] as ['code'],
		dpop_bound_access_tokens: true as const
	};
	if (config.isLoopback) {
		const q = new URLSearchParams({ redirect_uri: redirectUri, scope: SCOPE });
		return {
			...common,
			client_id: `http://localhost?${q}`,
			application_type: 'native',
			token_endpoint_auth_method: 'none'
		};
	}
	return {
		...common,
		client_id: `${config.appUrl}/oauth/client-metadata.json`,
		application_type: 'web',
		token_endpoint_auth_method: 'private_key_jwt',
		token_endpoint_auth_signing_alg: 'ES256',
		jwks_uri: `${config.appUrl}/oauth/jwks.json`
	};
}

const stateStore = {
	set: async (key: string, value: NodeSavedState) => {
		db.insert(oauthState)
			.values({ key, value: JSON.stringify(value) })
			.onConflictDoUpdate({ target: oauthState.key, set: { value: JSON.stringify(value) } })
			.run();
	},
	get: async (key: string) => {
		const row = db.select().from(oauthState).where(eq(oauthState.key, key)).get();
		return row ? (JSON.parse(row.value) as NodeSavedState) : undefined;
	},
	del: async (key: string) => {
		db.delete(oauthState).where(eq(oauthState.key, key)).run();
	}
};

const sessionStore = {
	set: async (did: string, value: NodeSavedSession) => {
		db.insert(oauthSession)
			.values({ did, value: JSON.stringify(value) })
			.onConflictDoUpdate({ target: oauthSession.did, set: { value: JSON.stringify(value) } })
			.run();
	},
	get: async (did: string) => {
		const row = db.select().from(oauthSession).where(eq(oauthSession.did, did)).get();
		return row ? (JSON.parse(row.value) as NodeSavedSession) : undefined;
	},
	del: async (did: string) => {
		db.delete(oauthSession).where(eq(oauthSession.did, did)).run();
	}
};

let clientPromise: Promise<NodeOAuthClient> | undefined;

export function getOAuthClient(): Promise<NodeOAuthClient> {
	clientPromise ??= (async () => {
		if (!config.isLoopback && config.oauthPrivateKeys.length === 0) {
			throw new Error('OAUTH_PRIVATE_KEYS is required outside loopback dev; run `pnpm keygen`');
		}
		const keyset = config.isLoopback
			? undefined
			: await Promise.all(config.oauthPrivateKeys.map((k) => JoseKey.fromImportable(k as string)));
		return new NodeOAuthClient({ clientMetadata: clientMetadata(), keyset, stateStore, sessionStore });
	})();
	return clientPromise;
}

/** Authenticated XRPC agent acting as `did`, or null if they have no stored OAuth session. */
export async function agentFor(did: string): Promise<Agent | null> {
	const client = await getOAuthClient();
	try {
		const session = await client.restore(did);
		return new Agent(session);
	} catch {
		return null;
	}
}
