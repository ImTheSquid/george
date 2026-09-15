// Browser side of the passkey ceremonies. Throws Error with a user-facing message.
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

async function post<T>(step: string, body: unknown): Promise<T> {
	const res = await fetch(`/api/auth/${step}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
	return data as T;
}

export async function signupWithPasskey(username: string, inviteCode: string): Promise<void> {
	const optionsJSON = await post<Parameters<typeof startRegistration>[0]['optionsJSON']>('signup-options', {
		username,
		inviteCode
	});
	const response = await startRegistration({ optionsJSON });
	await post('signup-verify', { response });
}

export async function loginWithPasskey(): Promise<void> {
	const optionsJSON = await post<Parameters<typeof startAuthentication>[0]['optionsJSON']>('login-options', {});
	const response = await startAuthentication({ optionsJSON });
	await post('login-verify', { response });
}
