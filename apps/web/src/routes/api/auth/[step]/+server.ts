import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthError, beginLogin, beginSignup, finishLogin, finishSignup } from '$lib/server/auth';
import { createSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ params, request, cookies }) => {
	const body = await request.json().catch(() => ({}));
	try {
		switch (params.step) {
			case 'signup-options':
				return json(await beginSignup(cookies, String(body.username ?? ''), String(body.inviteCode ?? '')));
			case 'signup-verify': {
				const userId = await finishSignup(cookies, body.response);
				createSession(cookies, userId);
				return json({ ok: true });
			}
			case 'login-options':
				return json(await beginLogin(cookies));
			case 'login-verify': {
				const userId = await finishLogin(cookies, body.response);
				createSession(cookies, userId);
				return json({ ok: true });
			}
			default:
				error(404);
		}
	} catch (e) {
		if (e instanceof AuthError) return json({ error: e.message }, { status: 400 });
		console.error(`[auth ${params.step}]`, e);
		return json({ error: 'Passkey operation failed.' }, { status: 400 });
	}
};
