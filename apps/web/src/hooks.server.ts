import type { Handle, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { SESSION_COOKIE, getSessionUserId } from '$lib/server/session';
import { bootstrapInvite } from '$lib/server/invites';
import { verifyToken } from '$lib/server/tokens';

export const init: ServerInit = async () => {
	if (!building) bootstrapInvite();
};

// /api/* (except /api/auth) is token-authenticated and used cross-origin by the extension.
const CORS = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
	'access-control-allow-headers': 'authorization, content-type',
	'access-control-max-age': '86400'
};

export const handle: Handle = async ({ event, resolve }) => {
	const isApi = event.url.pathname.startsWith('/api/') && !event.url.pathname.startsWith('/api/auth/');
	if (isApi && event.request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

	const auth = event.request.headers.get('authorization');
	if (isApi && auth?.startsWith('Bearer ')) {
		event.locals.userId = verifyToken(auth.slice(7).trim());
	} else {
		const sid = event.cookies.get(SESSION_COOKIE);
		event.locals.userId = sid ? getSessionUserId(sid) : null;
	}

	const response = await resolve(event);
	if (isApi) for (const [k, v] of Object.entries(CORS)) response.headers.set(k, v);
	return response;
};
