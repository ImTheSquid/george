// Paints your and your friends' highlights on the page; lets you highlight a selection.
import { browser, defineContentScript } from '#imports';
import { createTextQuoteSelectorMatcher, describeTextQuote, highlightText } from '@apache-annotator/dom';
import { api, NotConnected, type PageInfo } from '@/utils/api';
import { getSettings, isWebUrl } from '@/utils/settings';
import type { Message } from '@/utils/messages';

const MARK_ATTR = 'data-george-hl';
const MINE = 'rgba(241, 200, 87, 0.55)';
const FRIEND = 'rgba(104, 119, 208, 0.35)';

export default defineContentScript({
	matches: ['<all_urls>'],
	excludeMatches: [
		'*://localhost/*',
		'*://george.jackhogan.me/*',
		'*://*.messenger.com/*',
		'*://calendar.google.com/*',
		'*://mail.google.com/*',
		'*://chat.openai.com/*',
		'*://chatgpt.com/*'
	],
	runAt: 'document_idle',
	async main(ctx) {
		if (!isWebUrl(location.href)) return;
		const { token } = await getSettings();
		if (!token) return;

		let cleanups: (() => void)[] = [];
		let info: PageInfo | null = null;

		async function paintAll() {
			for (const c of cleanups) c();
			cleanups = [];
			try {
				info = await api.page(location.href);
			} catch (e) {
				if (!(e instanceof NotConnected)) console.warn('[george]', e);
				return;
			}
			for (const h of info.highlights) await paint(h);
		}

		async function paint(h: PageInfo['highlights'][number]) {
			const matcher = createTextQuoteSelectorMatcher({
				type: 'TextQuoteSelector',
				exact: h.highlight.exact,
				prefix: h.highlight.prefix ?? undefined,
				suffix: h.highlight.suffix ?? undefined
			});
			for await (const range of matcher(document.body)) {
				const who = h.mine ? 'you' : h.user.displayName ?? h.user.username;
				const title = h.highlight.note ? `${who}: ${h.highlight.note}` : `highlighted by ${who}`;
				cleanups.push(
					highlightText(range, 'mark', {
						[MARK_ATTR]: h.highlight.id,
						'data-george-mine': String(h.mine),
						title,
						style: `background:${h.mine ? MINE : FRIEND};color:inherit;cursor:${h.mine ? 'pointer' : 'default'}`
					})
				);
				break; // first match only
			}
		}

		// Remove your own highlight by clicking it.
		ctx.addEventListener(document, 'click', async (ev) => {
			const mark = (ev.target as Element | null)?.closest?.(`mark[${MARK_ATTR}][data-george-mine="true"]`);
			if (!mark) return;
			if (!confirm('Remove this highlight?')) return;
			await api.deleteHighlight(mark.getAttribute(MARK_ATTR)!);
			await paintAll();
		});

		// Floating "highlight" button on text selection.
		const button = document.createElement('button');
		button.textContent = 'highlight';
		button.setAttribute(
			'style',
			'position:fixed;z-index:2147483647;display:none;padding:4px 8px;font:13px system-ui;' +
				'background:#f1c857;color:#1a1a1a;border:0;border-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer'
		);
		document.documentElement.append(button);
		let pending: Range | null = null;

		ctx.addEventListener(document, 'selectionchange', () => {
			const sel = document.getSelection();
			if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) {
				button.style.display = 'none';
				pending = null;
				return;
			}
			const range = sel.getRangeAt(0);
			if (range.commonAncestorContainer instanceof Element && range.commonAncestorContainer.closest('input, textarea')) return;
			pending = range.cloneRange();
			const rect = range.getBoundingClientRect();
			button.style.left = `${Math.max(4, rect.left + rect.width / 2 - 34)}px`;
			button.style.top = `${Math.max(4, rect.top - 34)}px`;
			button.style.display = 'block';
		});

		button.addEventListener('mousedown', (ev) => ev.preventDefault());
		button.addEventListener('click', async () => {
			if (!pending) return;
			const range = pending;
			button.style.display = 'none';
			button.disabled = true;
			try {
				const sel = await describeTextQuote(range, document.body);
				await api.highlight({
					url: location.href,
					title: document.title,
					exact: sel.exact,
					prefix: sel.prefix,
					suffix: sel.suffix
				});
				document.getSelection()?.removeAllRanges();
				await paintAll();
				browser.runtime.sendMessage({ type: 'george:page-changed' } satisfies Message).catch(() => {});
			} catch (e) {
				console.error('[george]', e);
			} finally {
				button.disabled = false;
			}
		});

		browser.runtime.onMessage.addListener((raw: unknown) => {
			if ((raw as Message).type === 'george:refresh') paintAll();
		});

		await paintAll();
	}
});
