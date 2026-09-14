// Generate the confidential OAuth client's signing key. Paste the output into OAUTH_PRIVATE_KEYS.
import { JoseKey } from '@atproto/jwk-jose';

const key = await JoseKey.generate(['ES256'], crypto.randomUUID());
console.log(JSON.stringify([key.privateJwk]));
