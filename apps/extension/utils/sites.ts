// Decides whether george should highlight on a page. Three layers, first match wins:
// the user's choice for the host, a list of known app shells, then a look at the
// document itself. Default is on — a page is only suppressed on strong evidence, so
// an ordinary article is never gated off by accident.
//
// Everything here is pure so it can be unit-tested; the storage-backed wrappers live
// in settings.ts.

export type SiteReason = 'private' | 'secret' | 'user' | 'host' | 'type' | 'doc' | 'default';
export type SiteVerdict = { on: boolean; reason: SiteReason };

/**
 * Hosts whose pages are apps, not documents. Matched against the hostname and its
 * subdomains, so `slack.com` covers `app.slack.com`. Grows by hand; the document
 * heuristic below is what catches the long tail.
 *
 * github.com is deliberately absent — READMEs, issues and diffs are worth highlighting.
 */
export const APP_HOSTS: readonly string[] = [
	// chat and calls
	'discord.com',
	'slack.com',
	'messenger.com',
	'web.whatsapp.com',
	'web.telegram.org',
	'teams.microsoft.com',
	'teams.live.com',
	'meet.google.com',
	'zoom.us',
	// mail and calendar
	'mail.google.com',
	'calendar.google.com',
	'outlook.office.com',
	'outlook.office365.com',
	'outlook.live.com',
	'mail.proton.me',
	'app.fastmail.com',
	'hey.com',
	'mail.yahoo.com',
	// assistants
	'chatgpt.com',
	'chat.openai.com',
	'claude.ai',
	'gemini.google.com',
	'aistudio.google.com',
	'copilot.microsoft.com',
	// documents and design
	'docs.google.com',
	'sheets.google.com',
	'slides.google.com',
	'drive.google.com',
	'keep.google.com',
	'notion.so',
	'figma.com',
	'canva.com',
	'miro.com',
	'excalidraw.com',
	'overleaf.com',
	'airtable.com',
	// work trackers
	'linear.app',
	'asana.com',
	'trello.com',
	'atlassian.net',
	'monday.com',
	'clickup.com',
	// editors
	'vscode.dev',
	'github.dev',
	'codesandbox.io',
	'stackblitz.com',
	'replit.com',
	'app.diagrams.net',
	'photopea.com',
	// media
	'open.spotify.com',
	'music.youtube.com',
	'music.apple.com',
	'netflix.com',
	// sign-in
	'accounts.google.com',
	'login.microsoftonline.com'
];

/** A run of prose this long means the page is a document, whatever else is on it. */
const PROSE_CHARS = 120;
/** Share of the viewport a canvas has to cover before the page is one. */
const CANVAS_SHARE = 0.6;

/** True for the host itself and its subdomains, so `slack.com` misses `notslack.com`. */
export function hostMatches(hostname: string, list: readonly string[] = APP_HOSTS): boolean {
	const host = hostname.toLowerCase().replace(/\.$/, '');
	return list.some((h) => host === h || host.endsWith(`.${h}`));
}

const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.intranet', '.home.arpa', '.test', '.invalid'];

/** Your own machine, your LAN, or an intranet name — nothing here is a page anyone can share. */
export function isPrivateHost(hostname: string): boolean {
	const host = hostname.toLowerCase().replace(/\.$/, '').replace(/^\[|\]$/g, '');
	if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;
	if (PRIVATE_SUFFIXES.some((s) => host.endsWith(s))) return true;
	// A bare name with no dot is an intranet host; every public site has a public suffix.
	if (!host.includes('.') && !host.includes(':')) return true;
	const v4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(host);
	if (v4) {
		const a = Number(v4[1]);
		const b = Number(v4[2]);
		return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
	}
	// Unique-local (fc00::/7) and link-local (fe80::/10) IPv6.
	return /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
}

/** Parameter names that are a credential whatever their value looks like. */
const SECRET_PARAMS = new Set([
	'access_token',
	'id_token',
	'refresh_token',
	'auth_token',
	'authtoken',
	'client_secret',
	'secret',
	'password',
	'passwd',
	'pwd',
	'api_key',
	'apikey',
	'session_id',
	'sessionid',
	'otp',
	'jwt',
	'credential',
	'reset_token',
	'verification_token',
	'samlresponse',
	'x-amz-signature',
	'x-goog-signature'
]);
/** Names that are only a credential when the value is an opaque blob, so `?code=SAVE20` is fine. */
const MAYBE_SECRET_PARAMS = new Set(['token', 'code', 'auth', 'sig', 'signature', 'session', 'sid', 'state', 'nonce', 'ticket', 'assertion']);
const OPAQUE = /^[A-Za-z0-9._~+/=-]{20,}$/;

function paramsLookSecret(params: URLSearchParams): boolean {
	for (const [k, v] of params) {
		const name = k.toLowerCase();
		if (SECRET_PARAMS.has(name)) return true;
		if (MAYBE_SECRET_PARAMS.has(name) && OPAQUE.test(v)) return true;
	}
	return false;
}

/**
 * Does this URL carry something that must never leave the browser — a sign-in callback, a
 * password reset, a pre-signed download? Covers the fragment too, which is where the OAuth
 * implicit flow puts its access token.
 */
export function hasCredentials(u: URL): boolean {
	if (u.username || u.password) return true;
	if (paramsLookSecret(u.searchParams)) return true;
	const fragment = u.hash.slice(1);
	return fragment.includes('=') && paramsLookSecret(new URLSearchParams(fragment));
}

/**
 * Everything decidable from the URL alone, so the background can use it without a document.
 *
 * The first two are refusals rather than preferences: a LAN address or a URL carrying a token
 * is never sent anywhere, and no per-host choice turns that back on.
 */
export function urlVerdict(url: string, pref: boolean | undefined): SiteVerdict {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return { on: false, reason: 'type' };
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') return { on: false, reason: 'type' };
	if (isPrivateHost(u.hostname)) return { on: false, reason: 'private' };
	if (hasCredentials(u)) return { on: false, reason: 'secret' };
	if (pref !== undefined) return { on: pref, reason: 'user' };
	if (hostMatches(u.hostname)) return { on: false, reason: 'host' };
	return { on: true, reason: 'default' };
}

/** PDFs, JSON and plain text render as a viewer or a <pre>; there is nothing to anchor to. */
export function isHtmlDocument(doc: Document): boolean {
	return doc.contentType === 'text/html' || doc.contentType === 'application/xhtml+xml';
}

/** Any run of prose long enough to mean the page is meant to be read. */
function hasProse(doc: Document): boolean {
	for (const p of doc.querySelectorAll('p, blockquote')) {
		if ((p.textContent ?? '').trim().length >= PROSE_CHARS) return true;
	}
	return false;
}

function hasFullBleedCanvas(doc: Document): boolean {
	const view = doc.defaultView;
	if (!view) return false;
	const viewport = view.innerWidth * view.innerHeight;
	if (!viewport) return false;
	for (const c of doc.querySelectorAll('canvas')) {
		const r = c.getBoundingClientRect();
		if ((r.width * r.height) / viewport >= CANVAS_SHARE) return true;
	}
	return false;
}

/**
 * Layer 3: is this page a canvas or a declared application rather than a document?
 *
 * Deliberately narrow. Measured across live pages, the tempting signals do not separate a
 * chat app from a forum — Discord, Hacker News, lobste.rs and a GitHub issue all render
 * their text in divs and all sprout a composer once you are logged in. There is nothing in
 * the DOM to tell them apart, so that call belongs to APP_HOSTS, where it can be made
 * deliberately. What is left here are the two cases with no text to anchor to at all, both
 * paired with an absence of prose so a decorative background canvas cannot gate an article.
 */
export function looksLikeApp(doc: Document): boolean {
	if (hasProse(doc)) return false;
	return !!doc.querySelector('[role="application"]') || hasFullBleedCanvas(doc);
}

/** Every layer. */
export function pageVerdict(url: string, pref: boolean | undefined, doc: Document): SiteVerdict {
	const v = urlVerdict(url, pref);
	if (!v.on || v.reason === 'user') return v;
	if (!isHtmlDocument(doc)) return { on: false, reason: 'type' };
	if (looksLikeApp(doc)) return { on: false, reason: 'doc' };
	return { on: true, reason: 'default' };
}

/** Whether the popup should offer the On/Off buttons at all. */
export function isOverridable(v: SiteVerdict): boolean {
	return v.reason !== 'private' && v.reason !== 'secret';
}

/** One line for the popup saying where the verdict came from. */
export function explainVerdict(hostname: string, v: SiteVerdict): string {
	switch (v.reason) {
		case 'private':
			return 'off — a private address, never sent anywhere';
		case 'secret':
			return 'off — this URL carries a token, never sent anywhere';
		case 'user':
			return `${v.on ? 'on' : 'off'} — your choice for ${hostname}`;
		case 'host':
			return `off — ${hostname} is a known app`;
		case 'type':
			return 'off — not an HTML page';
		case 'doc':
			return 'off — this page looks like an app';
		default:
			return 'on — this page looks readable';
	}
}
