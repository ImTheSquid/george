// Client for george's /api/*, authenticated with the token from settings.
import { browser } from '#imports';
import { normalizeUrl, urlHash } from '@george/shared';
import { disconnect, getSettings } from './settings';
import type { HashResponse, Message } from './messages';

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
export type Comment = {
	id: string;
	userId: string;
	subjectType: 'link' | 'highlight' | 'comment';
	subjectId: string;
	text: string;
	createdAt: string;
	user: User;
	mine: boolean;
};
export type FeedItem =
	| { kind: 'link'; user: User; link: Link; createdAt: string }
	| { kind: 'highlight'; user: User; highlight: Highlight; createdAt: string };
export type PageInfo = {
	url: string;
	unsupported: boolean;
	mine: Link | null;
	friends: { user: User; link: Link }[];
	highlights: { user: User; highlight: Highlight; mine: boolean }[];
	comments: Comment[];
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

/** Canonical form for anything we send, so a fragment never leaves the browser. */
function canonical(url: string): string {
	try {
		return normalizeUrl(url);
	} catch {
		return url;
	}
}

/** SubtleCrypto is missing in a content script on an http:// page; the background has it. */
async function hashUrl(normalized: string): Promise<string> {
	if (globalThis.crypto?.subtle) return urlHash(normalized);
	const res = (await browser.runtime.sendMessage({ type: 'george:hash', url: normalized } satisfies Message)) as HashResponse;
	return res.hash;
}

/**
 * Looks a page up by the hash of its canonical URL, never the URL itself: a lookup happens for
 * every page you open, and a plain `?url=` would write your browsing history into the server's
 * access log. Only pages you deliberately save or highlight send their URL, and those go in a
 * request body. Normalizing here also means a fragment never leaves the browser.
 */
async function page(url: string): Promise<PageInfo> {
	let normalized: string;
	try {
		normalized = normalizeUrl(url);
	} catch {
		return { url, unsupported: true, mine: null, friends: [], highlights: [], comments: [] };
	}
	const net = await call<Omit<PageInfo, 'url' | 'unsupported'>>('GET', `/api/link?h=${await hashUrl(normalized)}`);
	return { url: normalized, unsupported: false, ...net };
}

export const api = {
	me: () => call<User>('GET', '/api/me'),
	feed: (limit = 50) => call<{ items: FeedItem[] }>('GET', `/api/feed?limit=${limit}`),
	page,
	save: (input: { url: string; title?: string; toRead?: boolean; favorite?: boolean }) =>
		call<{ id: string }>('POST', '/api/link', { ...input, url: canonical(input.url) }),
	unsave: (url: string) => call<{ ok: true }>('DELETE', '/api/link', { url: canonical(url) }),
	highlight: (input: { url: string; title?: string; exact: string; prefix?: string; suffix?: string; note?: string }) =>
		call<{ id: string; linkId: string }>('POST', '/api/highlight', { ...input, url: canonical(input.url) }),
	deleteHighlight: (id: string) => call<{ ok: true }>('DELETE', `/api/highlight/${id}`),
	setNote: (id: string, note: string | null) => call<{ ok: true }>('POST', `/api/highlight/${id}`, { note }),
	comment: (input: { subjectType: Comment['subjectType']; subjectId: string; text: string }) =>
		call<{ id: string }>('POST', '/api/comment', input),
	deleteComment: (id: string) => call<{ ok: true }>('DELETE', `/api/comment/${id}`)
};
