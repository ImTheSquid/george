import type { Handle, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { SESSION_COOKIE, getSessionUserId } from '$lib/server/session';
import { bootstrapInvite } from '$lib/server/invites';

export const init: ServerInit = async () => {
	if (!building) bootstrapInvite();
};

export const handle: Handle = async ({ event, resolve }) => {
	const sid = event.cookies.get(SESSION_COOKIE);
	event.locals.userId = sid ? getSessionUserId(sid) : null;
	return resolve(event);
};
