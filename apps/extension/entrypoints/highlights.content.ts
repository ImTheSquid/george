// Paints your and your friends' highlights on the page. Notes and comments live
// in cards in the right margin, aligned with their text; the only thing that
// floats over the text is the small toolbar shown on a selection.
import { browser, defineContentScript } from '#imports';
import { createTextQuoteSelectorMatcher, describeTextQuote, highlightText } from '@apache-annotator/dom';
import { api, NotConnected, type PageInfo } from '@/utils/api';
import { getSettings, isWebUrl } from '@/utils/settings';
import type { Message } from '@/utils/messages';

type Hl = PageInfo['highlights'][number];

const MARK_ATTR = 'data-george-hl';
const MINE = 'rgba(241, 200, 87, 0.55)';
const FRIEND = 'rgba(104, 119, 208, 0.35)';
const FONT = 'font:13px/1.4 system-ui,-apple-system,sans-serif;color:#1a1a1a';
const BTN = `${FONT};padding:4px 8px;background:#f1c857;border:0;border-radius:4px;cursor:pointer`;
const BTN_SOFT = `${BTN};background:#eee`;
const INPUT = `${FONT};width:100%;box-sizing:border-box;padding:5px 6px;border:1px solid #ccc;border-radius:4px;background:#fff`;
const CARD_W = 260;

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
		let lastInfo: PageInfo | null = null;
		/** Highlight whose card is in edit mode, if any. */
		let expandedId: string | null = null;
		let focusNoteOnce = false;

		// After an extension reload the old script lingers; its browser.* calls throw this. Not worth logging.
		const stale = (e: unknown) => ctx.isInvalid || (e instanceof Error && /context invalidated/i.test(e.message));
		const report = (e: unknown) => {
			if (!stale(e) && !(e instanceof NotConnected)) console.warn('[george]', e);
		};

		// Page-coordinate layer for everything we add, so it scrolls with the content.
		const root = document.createElement('div');
		root.setAttribute('style', 'position:absolute;z-index:2147483647;top:0;left:0;width:0;height:0');
		const cardsLayer = document.createElement('div');
		const toolbar = document.createElement('div');
		root.append(cardsLayer, toolbar);
		document.documentElement.append(root);
		ctx.onInvalidated(() => {
			for (const c of cleanups) c();
			cleanups = [];
			root.remove();
		});

		// ---- highlights ------------------------------------------------------------------

		async function refresh() {
			if (ctx.isInvalid) return;
			for (const c of cleanups) c();
			cleanups = [];
			try {
				lastInfo = await api.page(location.href);
			} catch (e) {
				report(e);
				return;
			}
			if (ctx.isInvalid) return;
			for (const h of lastInfo.highlights) await paint(h);
			layoutCards();
		}

		async function paint(h: Hl) {
			const matcher = createTextQuoteSelectorMatcher({
				type: 'TextQuoteSelector',
				exact: h.highlight.exact,
				prefix: h.highlight.prefix ?? undefined,
				suffix: h.highlight.suffix ?? undefined
			});
			for await (const range of matcher(document.body)) {
				cleanups.push(
					highlightText(range, 'mark', {
						[MARK_ATTR]: h.highlight.id,
						style: `background:${h.mine ? MINE : FRIEND};color:inherit;cursor:pointer`
					})
				);
				break; // first match only
			}
		}

		function notify() {
			browser.runtime.sendMessage({ type: 'george:page-changed' } satisfies Message).catch(() => {});
		}

		function markFor(id: string): Element | null {
			return document.querySelector(`mark[${MARK_ATTR}="${id}"]`);
		}

		// ---- margin cards ----------------------------------------------------------------

		function commentsFor(type: 'highlight' | 'comment', id: string, depth = 0) {
			const out: { id: string; name: string; text: string; depth: number; mine: boolean }[] = [];
			for (const c of (lastInfo?.comments ?? []).filter((c) => c.subjectType === type && c.subjectId === id)) {
				out.push({ id: c.id, name: c.mine ? 'you' : c.user.displayName ?? c.user.username, text: c.text, depth, mine: c.mine });
				out.push(...commentsFor('comment', c.id, depth + 1));
			}
			return out;
		}

		function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text?: string): HTMLElementTagNameMap[K] {
			const e = document.createElement(tag);
			e.setAttribute('style', style);
			if (text !== undefined) e.textContent = text;
			return e;
		}

		function buildCard(h: Hl, expanded: boolean): HTMLElement {
			const card = el(
				'div',
				`position:absolute;width:${CARD_W}px;box-sizing:border-box;padding:8px 10px;background:#fff;${FONT};font-size:12px;` +
					`border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.25);${expanded ? '' : 'cursor:pointer'}`
			);
			const author = h.mine ? 'you' : h.user.displayName ?? h.user.username;
			card.append(el('div', 'font-weight:600;margin-bottom:2px', author));

			const comments = commentsFor('highlight', h.highlight.id);

			if (!expanded) {
				if (h.highlight.note) card.append(el('div', 'white-space:pre-wrap', h.highlight.note));
				for (const c of comments) {
					const row = el('div', `margin:4px 0 0 ${Math.min(c.depth, 3) * 10}px;padding-top:4px;border-top:1px solid #eee`);
					row.append(el('span', 'color:#666', `${c.name}: `), document.createTextNode(c.text));
					card.append(row);
				}
				card.addEventListener('click', () => expand(h.highlight.id));
				return card;
			}

			// Expanded: edit own note, comment, remove.
			const fail = el('div', 'display:none;color:#c0392b');
			const showError = (e: unknown) => {
				report(e);
				if (stale(e)) return;
				fail.textContent = e instanceof Error ? e.message : String(e);
				fail.style.display = 'block';
			};

			if (h.mine) {
				const note = el('textarea', `${INPUT};resize:vertical;margin-top:4px`);
				note.rows = 3;
				note.placeholder = 'Your note';
				note.value = h.highlight.note ?? '';
				const row = el('div', 'display:flex;gap:6px;justify-content:flex-end;margin-top:6px');
				const remove = el('button', BTN_SOFT, 'Remove');
				const save = el('button', BTN, 'Save');
				remove.addEventListener('click', async () => {
					try {
						await api.deleteHighlight(h.highlight.id);
						expandedId = null;
						await refresh();
						notify();
					} catch (e) {
						showError(e);
					}
				});
				save.addEventListener('click', async () => {
					try {
						await api.setNote(h.highlight.id, note.value.trim() || null);
						expandedId = null;
						await refresh();
					} catch (e) {
						showError(e);
					}
				});
				note.addEventListener('keydown', (e) => {
					e.stopPropagation();
					if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save.click();
				});
				row.append(remove, save);
				card.append(note, row);
				if (focusNoteOnce) {
					focusNoteOnce = false;
					queueMicrotask(() => note.focus());
				}
			} else if (h.highlight.note) {
				card.append(el('div', 'white-space:pre-wrap', h.highlight.note));
			}

			if (comments.length) {
				const list = el('div', 'margin-top:6px;border-top:1px solid #eee');
				for (const c of comments) {
					const row = el('div', `margin:4px 0 0 ${Math.min(c.depth, 3) * 10}px;padding-top:4px`);
					row.append(el('span', 'color:#666', `${c.name}: `), document.createTextNode(c.text));
					if (c.mine) {
						const del = el('button', `${FONT};font-size:11px;color:#666;background:none;border:0;padding:0 0 0 6px;cursor:pointer;text-decoration:underline`, 'delete');
						del.addEventListener('click', async () => {
							try {
								await api.deleteComment(c.id);
								await refresh();
							} catch (e) {
								showError(e);
							}
						});
						row.append(del);
					}
					list.append(row);
				}
				card.append(list);
			}

			const replyRow = el('div', 'display:flex;gap:6px;margin-top:6px');
			const input = el('input', `${INPUT};flex:1`);
			input.placeholder = comments.length ? 'Reply…' : 'Add a comment…';
			const reply = el('button', BTN, 'Reply');
			reply.addEventListener('click', async () => {
				const text = input.value.trim();
				if (!text) return;
				reply.disabled = true;
				try {
					await api.comment({ subjectType: 'highlight', subjectId: h.highlight.id, text });
					await refresh();
				} catch (e) {
					showError(e);
					reply.disabled = false;
				}
			});
			input.addEventListener('keydown', (e) => {
				e.stopPropagation();
				if (e.key === 'Enter') reply.click();
			});
			replyRow.append(input, reply);
			const close = el('button', `${FONT};font-size:11px;color:#666;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;align-self:flex-start;margin-top:6px`, 'close');
			close.addEventListener('click', () => {
				expandedId = null;
				layoutCards();
			});
			card.append(replyRow, fail, close);
			return card;
		}

		function layoutCards() {
			cardsLayer.replaceChildren();
			if (!lastInfo) return;
			const viewportW = document.documentElement.clientWidth;

			const entries: { top: number; left: number; el: HTMLElement; below: boolean }[] = [];
			for (const h of lastInfo.highlights) {
				const expanded = h.highlight.id === expandedId;
				const hasContent = !!h.highlight.note || commentsFor('highlight', h.highlight.id).length > 0;
				if (!expanded && !hasContent) continue;
				const mark = markFor(h.highlight.id);
				if (!mark) continue;
				const rect = mark.getBoundingClientRect();
				// Prefer the gutter right of the text column; if there is none, only the expanded
				// card is shown, placed under its highlight.
				const block = mark.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, td, article, section, div') ?? mark;
				const columnRight = block.getBoundingClientRect().right;
				const gutter = columnRight + 16 + CARD_W <= viewportW - 8;
				if (!gutter && !expanded) continue;
				const card = buildCard(h, expanded);
				if (gutter) {
					entries.push({ top: rect.top + window.scrollY, left: columnRight + 16 + window.scrollX, el: card, below: false });
				} else {
					const w = Math.min(CARD_W, viewportW - 16);
					card.style.width = `${w}px`;
					const left = Math.min(Math.max(8, rect.left), viewportW - w - 8);
					entries.push({ top: rect.bottom + 8 + window.scrollY, left: left + window.scrollX, el: card, below: true });
				}
			}

			entries.sort((a, b) => a.top - b.top);
			let cursor = 0;
			for (const e of entries) {
				cardsLayer.append(e.el);
				const top = e.below ? e.top : Math.max(e.top, cursor);
				e.el.style.left = `${e.left}px`;
				e.el.style.top = `${top}px`;
				cursor = top + e.el.offsetHeight + 8;
			}
		}

		function expand(id: string) {
			expandedId = id;
			layoutCards();
		}

		// ---- selection toolbar (the only thing that floats over the text) ----------------

		toolbar.setAttribute('style', 'position:absolute;display:none;gap:4px;box-shadow:0 1px 4px rgba(0,0,0,.3);border-radius:4px');
		const hlBtn = el('button', BTN, 'highlight');
		const noteBtn = el('button', BTN, '+ note');
		toolbar.append(hlBtn, noteBtn);
		let pending: Range | null = null;

		function showToolbar(range: Range) {
			const rect = range.getBoundingClientRect();
			toolbar.style.display = 'flex';
			const w = toolbar.offsetWidth || 120;
			const left = Math.min(Math.max(4, rect.left + rect.width / 2 - w / 2), document.documentElement.clientWidth - w - 4);
			toolbar.style.left = `${left + window.scrollX}px`;
			toolbar.style.top = `${Math.max(4, rect.top - toolbar.offsetHeight - 8) + window.scrollY}px`;
		}

		ctx.addEventListener(document, 'selectionchange', () => {
			const sel = document.getSelection();
			if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) {
				toolbar.style.display = 'none';
				pending = null;
				return;
			}
			const range = sel.getRangeAt(0);
			const container = range.commonAncestorContainer;
			const node = container instanceof Element ? container : container.parentElement;
			if (!node || node.closest('input, textarea, [contenteditable]') || root.contains(node)) return;
			pending = range.cloneRange();
			showToolbar(range);
		});

		for (const b of [hlBtn, noteBtn]) b.addEventListener('mousedown', (e) => e.preventDefault());

		async function createHighlight(range: Range, thenEdit: boolean) {
			toolbar.style.display = 'none';
			const sel = await describeTextQuote(range, document.body);
			const { id } = await api.highlight({
				url: location.href,
				title: document.title,
				exact: sel.exact,
				prefix: sel.prefix,
				suffix: sel.suffix
			});
			document.getSelection()?.removeAllRanges();
			if (thenEdit) {
				expandedId = id;
				focusNoteOnce = true;
			}
			await refresh();
			notify();
		}

		hlBtn.addEventListener('click', () => {
			if (pending) createHighlight(pending, false).catch(report);
		});
		noteBtn.addEventListener('click', () => {
			if (pending) createHighlight(pending, true).catch(report);
		});

		// Click a highlight → expand its card. Click elsewhere (outside our UI) → collapse.
		ctx.addEventListener(document, 'click', (ev) => {
			// composedPath, not target: a card click re-renders the cards, detaching the target before we run.
			if (ev.composedPath().includes(root)) return;
			const target = ev.target as Element | null;
			const mark = target?.closest?.(`mark[${MARK_ATTR}]`);
			if (mark) {
				ev.preventDefault();
				expand(mark.getAttribute(MARK_ATTR)!);
				return;
			}
			if (expandedId) {
				expandedId = null;
				layoutCards();
			}
		});
		ctx.addEventListener(document, 'keydown', (ev) => {
			if (ev.key === 'Escape' && expandedId) {
				expandedId = null;
				layoutCards();
			}
		});

		ctx.addEventListener(window, 'resize', layoutCards, { passive: true });
		ctx.addEventListener(window, 'load', layoutCards);
		ctx.setTimeout(layoutCards, 1500);

		browser.runtime.onMessage.addListener((raw: unknown) => {
			if ((raw as Message).type === 'george:refresh') refresh();
		});

		await refresh();
	}
});
