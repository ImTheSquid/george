import { describe, expect, it } from 'vitest';
import { hasCredentials, hostMatches, isHtmlDocument, isPrivateHost, looksLikeApp, pageVerdict, urlVerdict } from './sites';

const html = (body: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${body}</body></html>`, 'text/html');
const prose = (n: number) => 'a word '.repeat(Math.ceil(n / 7)).slice(0, n);

describe('hostMatches', () => {
	it('matches the host and its subdomains', () => {
		expect(hostMatches('slack.com')).toBe(true);
		expect(hostMatches('app.slack.com')).toBe(true);
		expect(hostMatches('SLACK.com')).toBe(true);
		expect(hostMatches('slack.com.')).toBe(true);
	});

	it('does not match a host that merely ends in the same letters', () => {
		expect(hostMatches('notslack.com')).toBe(false);
		expect(hostMatches('slack.com.evil.test')).toBe(false);
	});

	it('leaves sites worth reading alone', () => {
		expect(hostMatches('github.com')).toBe(false);
		expect(hostMatches('news.ycombinator.com')).toBe(false);
	});
});

describe('isPrivateHost', () => {
	it('catches loopback, LAN and intranet names', () => {
		for (const h of [
			'localhost',
			'app.localhost',
			'127.0.0.1',
			'10.0.0.5',
			'192.168.1.20',
			'172.16.4.4',
			'172.31.255.1',
			'169.254.1.1',
			'[::1]',
			'fd00::1',
			'fe80::1',
			'printer.local',
			'wiki.internal',
			'nas',
			'0.0.0.0'
		]) {
			expect(isPrivateHost(h), h).toBe(true);
		}
	});

	it('leaves public hosts alone', () => {
		for (const h of ['example.com', '8.8.8.8', '172.32.0.1', '172.15.0.1', '11.0.0.1', 'localhost.example.com']) {
			expect(isPrivateHost(h), h).toBe(false);
		}
	});
});

describe('hasCredentials', () => {
	const u = (s: string) => new URL(s);

	it('catches tokens in the query', () => {
		expect(hasCredentials(u('https://x.example/cb?access_token=abc'))).toBe(true);
		expect(hasCredentials(u('https://x.example/r?reset_token=a'))).toBe(true);
		expect(hasCredentials(u('https://x.example/f?X-Amz-Signature=deadbeef'))).toBe(true);
	});

	it('catches tokens in the fragment, where the implicit flow puts them', () => {
		expect(hasCredentials(u('https://x.example/cb#access_token=abc&token_type=bearer'))).toBe(true);
	});

	it('catches userinfo', () => {
		expect(hasCredentials(u('https://user:pw@x.example/'))).toBe(true);
	});

	it('judges ambiguous names by whether the value is an opaque blob', () => {
		expect(hasCredentials(u('https://shop.example/?code=SAVE20'))).toBe(false);
		expect(hasCredentials(u('https://news.example/?state=CA'))).toBe(false);
		expect(hasCredentials(u('https://x.example/cb?code=4%2F0AY0e-g5xKqLmNoPqRsTuVwXyZ01234'))).toBe(true);
	});

	it('leaves an ordinary URL alone', () => {
		expect(hasCredentials(u('https://example.com/post?page=2#intro'))).toBe(false);
	});

	// A `secret` verdict cannot be overridden, so a false positive locks the user out.
	it('does not trip on a long search term', () => {
		expect(hasCredentials(u('https://example.com/s?key=antikythera-mechanism-reconstruction'))).toBe(false);
		expect(hasCredentials(u('https://example.com/s?q=how+do+i+normalize+a+url+in+typescript'))).toBe(false);
	});
});

describe('urlVerdict', () => {
	it('defaults to on', () => {
		expect(urlVerdict('https://example.com/post', undefined)).toEqual({ on: true, reason: 'default' });
	});

	it('turns known apps off', () => {
		expect(urlVerdict('https://app.slack.com/client/T1', undefined)).toEqual({ on: false, reason: 'host' });
	});

	it('lets the user override in both directions', () => {
		expect(urlVerdict('https://app.slack.com/client/T1', true)).toEqual({ on: true, reason: 'user' });
		expect(urlVerdict('https://example.com/post', false)).toEqual({ on: false, reason: 'user' });
	});

	it('refuses private addresses and credential URLs whatever the user chose', () => {
		expect(urlVerdict('http://192.168.1.5/wiki', true)).toEqual({ on: false, reason: 'private' });
		expect(urlVerdict('https://example.com/cb#access_token=abc', true)).toEqual({ on: false, reason: 'secret' });
	});

	it('refuses non-web schemes', () => {
		expect(urlVerdict('file:///Users/me/notes.html', undefined)).toEqual({ on: false, reason: 'type' });
		expect(urlVerdict('not a url', undefined)).toEqual({ on: false, reason: 'type' });
	});
});

/** happy-dom has no layout, so a canvas has to be told how big it is. */
function withCanvas(doc: Document, share: number): Document {
	const view = doc.defaultView!;
	const canvas = doc.querySelector('canvas')!;
	canvas.getBoundingClientRect = () =>
		({ width: view.innerWidth * share, height: view.innerHeight }) as DOMRect;
	return doc;
}

describe('looksLikeApp', () => {
	it('is false for prose', () => {
		expect(looksLikeApp(html(`<article><p>${prose(300)}</p></article>`))).toBe(false);
	});

	it('is true for a declared application', () => {
		expect(looksLikeApp(html('<div role="application"><div>toolbar</div></div>'))).toBe(true);
	});

	it('is true for a page that is one big canvas', () => {
		expect(looksLikeApp(withCanvas(html('<canvas></canvas>'), 1))).toBe(true);
	});

	it('is false for a small canvas next to other content', () => {
		expect(looksLikeApp(withCanvas(html('<canvas></canvas><div>chart</div>'), 0.2))).toBe(false);
	});

	it('leaves an article with a decorative full-bleed canvas alone', () => {
		expect(looksLikeApp(withCanvas(html(`<canvas></canvas><p>${prose(300)}</p>`), 1))).toBe(false);
	});

	// The signals that look tempting but do not separate a chat app from a forum.
	it('does not gate a comment thread that renders its text in divs', () => {
		const doc = html(`
			<ol><li><div>hey</div></li><li><div>did you see this</div></li></ol>
			<form><textarea></textarea></form>
		`);
		expect(looksLikeApp(doc)).toBe(false);
	});

	it('does not gate a plain page with no prose', () => {
		expect(looksLikeApp(html('<div><div>Dashboard</div><div>42</div></div>'))).toBe(false);
	});

	it('counts a blockquote as prose', () => {
		expect(looksLikeApp(withCanvas(html(`<canvas></canvas><blockquote>${prose(300)}</blockquote>`), 1))).toBe(false);
	});
});

describe('isHtmlDocument', () => {
	it('accepts html', () => {
		expect(isHtmlDocument(html('<p>hi</p>'))).toBe(true);
	});

	it('rejects anything else', () => {
		const xml = new DOMParser().parseFromString('<feed><entry/></feed>', 'text/xml');
		expect(isHtmlDocument(xml)).toBe(false);
	});
});

describe('pageVerdict', () => {
	it('lets a user override beat both the host list and the document', () => {
		const doc = html('<div role="application"></div>');
		expect(pageVerdict('https://app.slack.com/client/T1', true, doc)).toEqual({ on: true, reason: 'user' });
	});

	it('short-circuits on the host list without looking at the document', () => {
		expect(pageVerdict('https://discord.com/channels/1', undefined, html(`<p>${prose(300)}</p>`))).toEqual({
			on: false,
			reason: 'host'
		});
	});

	it('falls through to the document for an unlisted app', () => {
		const doc = html('<div role="application"><canvas></canvas></div>');
		expect(pageVerdict('https://some-app.example/', undefined, doc)).toEqual({ on: false, reason: 'doc' });
	});

	it('leaves an unlisted forum on, since nothing in its markup says otherwise', () => {
		const doc = html('<ol><li>hi</li></ol><form><textarea></textarea></form>');
		expect(pageVerdict('https://forum.example/t/1', undefined, doc)).toEqual({ on: true, reason: 'default' });
	});

	it('leaves an ordinary article on', () => {
		expect(pageVerdict('https://example.com/post', undefined, html(`<p>${prose(300)}</p>`))).toEqual({
			on: true,
			reason: 'default'
		});
	});

	it('refuses a credential URL before it ever looks at the page', () => {
		expect(pageVerdict('https://example.com/cb?access_token=abc', undefined, html(`<p>${prose(300)}</p>`))).toEqual({
			on: false,
			reason: 'secret'
		});
	});
});
