// Client for george's /api/*, authenticated with the token from settings.
import { disconnect, getSettings } from './settings';

export type User = { id: string; username: string; displayName: string | null };
export type Link = {
	id: string;
	url: string;
	title: string | null;
	toRead: boolean;
	favorite: boolean;
	tags: string[];
	createdAt: string;
};
export type Highlight = {
	id: string;
	url: string;
	exact: string;
	prefix: string | null;
	suffix: string | null;
	note: string | null;
	createdAt: string;
};
export type PageInfo = {
	url: string;
	unsupported: boolean;
	mine: Link | null;
	friends: { user: User; link: Link }[];
	highlights: { user: User; highlight: Highlight; mine: boolean }[];
};

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
	}
}

export class NotConnected extends Error {}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
	const { token, appUrl } = await getSettings();
	if (!token) throw new NotConnected('Extension is not connected to george');
	const res = await fetch(`${appUrl}${path}`, {
		method,
		headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
		body: body ? JSON.stringify(body) : undefined
	});
	if (res.status === 401) {
		await disconnect();
		throw new NotConnected('Token was revoked; connect the extension again');
	}
	if (!res.ok) {
		const data = await res.json().catch(() => ({}));
		throw new ApiError(data.error ?? data.message ?? `${method} ${path} failed (${res.status})`, res.status);
	}
	return (await res.json()) as T;
}

export const api = {
	me: () => call<User>('GET', '/api/me'),
	page: (url: string) => call<PageInfo>('GET', `/api/link?url=${encodeURIComponent(url)}`),
	save: (input: { url: string; title?: string; toRead?: boolean; favorite?: boolean }) =>
		call<{ id: string }>('POST', '/api/link', input),
	unsave: (url: string) => call<{ ok: true }>('DELETE', '/api/link', { url }),
	highlight: (input: { url: string; title?: string; exact: string; prefix?: string; suffix?: string; note?: string }) =>
		call<{ id: string; linkId: string }>('POST', '/api/highlight', input),
	deleteHighlight: (id: string) => call<{ ok: true }>('DELETE', `/api/highlight/${id}`),
	setNote: (id: string, note: string | null) => call<{ ok: true }>('POST', `/api/highlight/${id}`, { note })
};
