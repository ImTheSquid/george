// Shared helpers for the JSON API used by the extension.
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function requireUser(event: RequestEvent): string {
	if (!event.locals.userId) error(401, 'Unauthorized');
	return event.locals.userId;
}

export async function readJson<T>(request: Request): Promise<T> {
	try {
		return (await request.json()) as T;
	} catch {
		error(400, 'Invalid JSON body');
	}
}

export function apiError(e: unknown): Response {
	console.error('[api]', e);
	return json({ error: e instanceof Error ? e.message : 'Request failed' }, { status: 400 });
}
