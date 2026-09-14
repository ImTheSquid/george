import type { Handle, ServerInit } from '@sveltejs/kit';
import { building } from '$app/environment';
import { config } from '$lib/server/config';
import { SESSION_COOKIE, getSessionDid } from '$lib/server/session';
import { startIndexer } from '$lib/server/indexer';

export const init: ServerInit = async () => {
	if (!building && config.indexer) startIndexer();
};

export const handle: Handle = async ({ event, resolve }) => {
	const sid = event.cookies.get(SESSION_COOKIE);
	event.locals.did = sid ? getSessionDid(sid) : null;
	return resolve(event);
};
