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

export const api = {
	me: () => call<User>('GET', '/api/me'),
	feed: (limit = 50) => call<{ items: FeedItem[] }>('GET', `/api/feed?limit=${limit}`),
	page: (url: string) => call<PageInfo>('GET', `/api/link?url=${encodeURIComponent(url)}`),
	save: (input: { url: string; title?: string; toRead?: boolean; favorite?: boolean }) =>
		call<{ id: string }>('POST', '/api/link', input),
	unsave: (url: string) => call<{ ok: true }>('DELETE', '/api/link', { url }),
	highlight: (input: { url: string; title?: string; exact: string; prefix?: string; suffix?: string; note?: string }) =>
		call<{ id: string; linkId: string }>('POST', '/api/highlight', input),
	deleteHighlight: (id: string) => call<{ ok: true }>('DELETE', `/api/highlight/${id}`),
	setNote: (id: string, note: string | null) => call<{ ok: true }>('POST', `/api/highlight/${id}`, { note }),
	comment: (input: { subjectType: Comment['subjectType']; subjectId: string; text: string }) =>
		call<{ id: string }>('POST', '/api/comment', input),
	deleteComment: (id: string) => call<{ ok: true }>('DELETE', `/api/comment/${id}`)
};
