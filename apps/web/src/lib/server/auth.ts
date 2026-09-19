// Passkey (WebAuthn) signup and login. george is the relying party.
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type AuthenticatorTransport,
	type PublicKeyCredentialCreationOptionsJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import type { Cookies } from '@sveltejs/kit';
import { USERNAME_RE, USERNAME_RULE } from '@george/shared';
import { count, eq, lt } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { challenge, credential, user } from '$lib/server/db/schema';
import { config } from '$lib/server/config';
import { newId, now } from '$lib/server/ids';
import { checkInvite, consumeInvite } from '$lib/server/invites';

export class AuthError extends Error {}

const CHALLENGE_COOKIE = 'george_wa';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function storeChallenge(
	cookies: Cookies,
	value: string,
	kind: 'signup' | 'login',
	extra: { username?: string; inviteCode?: string } = {}
): void {
	db.delete(challenge).where(lt(challenge.expiresAt, now())).run();
	const id = newId(16);
	db.insert(challenge)
		.values({
			id,
			challenge: value,
			kind,
			username: extra.username ?? null,
			inviteCode: extra.inviteCode ?? null,
			expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
		})
		.run();
	cookies.set(CHALLENGE_COOKIE, id, {
		path: '/api/auth',
		httpOnly: true,
		sameSite: 'strict',
		secure: !config.isDev,
		maxAge: CHALLENGE_TTL_MS / 1000
	});
}

function takeChallenge(cookies: Cookies, kind: 'signup' | 'login') {
	const id = cookies.get(CHALLENGE_COOKIE);
	cookies.delete(CHALLENGE_COOKIE, { path: '/api/auth' });
	if (!id) throw new AuthError('No pending passkey ceremony; start again.');
	const row = db.select().from(challenge).where(eq(challenge.id, id)).get();
	if (row) db.delete(challenge).where(eq(challenge.id, id)).run();
	if (!row || row.kind !== kind || row.expiresAt < now()) {
		throw new AuthError('Passkey ceremony expired; start again.');
	}
	return row;
}

function validateSignup(username: string, inviteCode: string) {
	if (!USERNAME_RE.test(username)) throw new AuthError(`Usernames are ${USERNAME_RULE}`);
	if (db.select({ id: user.id }).from(user).where(eq(user.username, username)).get()) {
		throw new AuthError('That username is taken.');
	}
	if (config.inviteRequired && !checkInvite(inviteCode)) throw new AuthError('Invalid or used invite code.');
}

export async function beginSignup(
	cookies: Cookies,
	rawUsername: string,
	inviteCode: string
): Promise<PublicKeyCredentialCreationOptionsJSON> {
	const username = rawUsername.trim().toLowerCase();
	validateSignup(username, inviteCode);
	const options = await generateRegistrationOptions({
		rpName: config.rpName,
		rpID: config.rpId,
		userName: username,
		userDisplayName: username,
		attestationType: 'none',
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
	});
	storeChallenge(cookies, options.challenge, 'signup', { username, inviteCode });
	return options;
}

export async function finishSignup(cookies: Cookies, response: RegistrationResponseJSON): Promise<string> {
	const ch = takeChallenge(cookies, 'signup');
	const username = ch.username!;
	const inviteCode = ch.inviteCode ?? '';
	validateSignup(username, inviteCode);

	const v = await verifyRegistrationResponse({
		response,
		expectedChallenge: ch.challenge,
		expectedOrigin: config.appUrl,
		expectedRPID: config.rpId,
		requireUserVerification: false
	});
	if (!v.verified) throw new AuthError('Passkey verification failed.');
	const info = v.registrationInfo;

	const t = now();
	const userId = newId();
	const isFirst = (db.select({ n: count() }).from(user).get()?.n ?? 0) === 0;
	db.transaction((tx) => {
		tx.insert(user).values({ id: userId, username, isAdmin: isFirst, createdAt: t }).run();
		tx.insert(credential)
			.values({
				id: info.credential.id,
				userId,
				publicKey: Buffer.from(info.credential.publicKey),
				counter: info.credential.counter,
				transports: info.credential.transports ?? [],
				deviceType: info.credentialDeviceType,
				backedUp: info.credentialBackedUp,
				createdAt: t,
				lastUsedAt: t
			})
			.run();
	});
	if (config.inviteRequired) consumeInvite(inviteCode, userId);
	return userId;
}

export async function beginLogin(cookies: Cookies): Promise<PublicKeyCredentialRequestOptionsJSON> {
	// No allowCredentials: the browser offers the user's discoverable passkeys for this site.
	const options = await generateAuthenticationOptions({ rpID: config.rpId, userVerification: 'preferred' });
	storeChallenge(cookies, options.challenge, 'login');
	return options;
}

export async function finishLogin(cookies: Cookies, response: AuthenticationResponseJSON): Promise<string> {
	const ch = takeChallenge(cookies, 'login');
	const cred = db.select().from(credential).where(eq(credential.id, response.id)).get();
	if (!cred) throw new AuthError('Unknown passkey.');

	const v = await verifyAuthenticationResponse({
		response,
		expectedChallenge: ch.challenge,
		expectedOrigin: config.appUrl,
		expectedRPID: config.rpId,
		requireUserVerification: false,
		credential: {
			id: cred.id,
			publicKey: new Uint8Array(cred.publicKey),
			counter: cred.counter,
			transports: cred.transports as AuthenticatorTransport[]
		}
	});
	if (!v.verified) throw new AuthError('Passkey verification failed.');
	db.update(credential)
		.set({ counter: v.authenticationInfo.newCounter, lastUsedAt: now() })
		.where(eq(credential.id, cred.id))
		.run();
	return cred.userId;
}
