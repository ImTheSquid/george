import { env } from '$env/dynamic/private';

const appUrl = (env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');

export const config = {
	appUrl,
	/** WebAuthn relying party id: the app's hostname. */
	rpId: new URL(appUrl).hostname,
	rpName: 'george',
	// process.env first so tests can point at ':memory:' despite the .env file
	databaseUrl: process.env.DATABASE_URL ?? env.DATABASE_URL ?? 'data/george.db',
	inviteRequired: env.INVITE_REQUIRED !== '0',
	isDev: /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(appUrl)
};
