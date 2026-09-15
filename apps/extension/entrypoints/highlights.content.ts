// Paints your and your friends' highlights on the page; lets you highlight a
// selection, optionally with a note, and edit or remove your own.
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
		let byId = new Map<string, Hl>();
		let lastInfo: PageInfo | null = null;

		// After an extension reload the old script lingers; its browser.* calls throw this. Not an error worth logging.
		const stale = (e: unknown) => ctx.isInvalid || (e instanceof Error && /context invalidated/i.test(e.message));
		const report = (e: unknown) => {
			if (!stale(e) && !(e instanceof NotConnected)) console.warn('[george]', e);
		};
		async function paintAll() {
			if (ctx.isInvalid) return;
			for (const c of cleanups) c();
			cleanups = [];
			let info: PageInfo;
			try {
				info = await api.page(location.href);
			} catch (e) {
				report(e);
				return;
			}
			if (ctx.isInvalid) return;
			lastInfo = info;
			byId = new Map(info.highlights.map((h) => [h.highlight.id, h]));
			for (const h of info.highlights) await paint(h);
			layoutCards();
		}

		// ---- margin cards: notes and comments always visible beside the text -----------------

		const cardsLayer = document.createElement('div');
		const CARD_W = 260;

		function commentsFor(type: 'highlight' | 'comment', id: string, depth = 0): { name: string; text: string; depth: number }[] {
			const out: { name: string; text: string; depth: number }[] = [];
			for (const c of (lastInfo?.comments ?? []).filter((c) => c.subjectType === type && c.subjectId === id)) {
				out.push({ name: c.mine ? 'you' : c.user.displayName ?? c.user.username, text: c.text, depth });
				out.push(...commentsFor('comment', c.id, depth + 1));
			}
			return out;
		}

		function layoutCards() {
			cardsLayer.replaceChildren();
			const viewportW = document.documentElement.clientWidth;
			if (viewportW < 700 || !lastInfo) return;

			const entries: { top: number; left: number; el: HTMLElement }[] = [];
			for (const h of lastInfo.highlights) {
				const comments = commentsFor('highlight', h.highlight.id);
				if (!h.highlight.note && comments.length === 0) continue;
				const mark = document.querySelector(`mark[${MARK_ATTR}="${h.highlight.id}"]`);
				if (!mark) continue;
				const rect = mark.getBoundingClientRect();
				// Sit just right of the text column the highlight lives in.
				const block = mark.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, td, article, section, div') ?? mark;
				const columnRight = block.getBoundingClientRect().right;
				const left = Math.min(columnRight + 16, viewportW - CARD_W - 8) + window.scrollX;

				const card = document.createElement('div');
				card.setAttribute(
					'style',
					`position:absolute;width:${CARD_W}px;box-sizing:border-box;padding:8px 10px;background:#fff;${FONT};font-size:12px;` +
						'border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,.25);cursor:pointer'
				);
				const author = document.createElement('div');
				author.setAttribute('style', 'font-weight:600;margin-bottom:2px');
				author.textContent = h.mine ? 'you' : h.user.displayName ?? h.user.username;
				card.append(author);
				if (h.highlight.note) {
					const note = document.createElement('div');
					note.setAttribute('style', 'white-space:pre-wrap');
					note.textContent = h.highlight.note;
					card.append(note);
				}
				for (const c of comments) {
					const row = document.createElement('div');
					row.setAttribute('style', `margin:4px 0 0 ${Math.min(c.depth, 3) * 10}px;padding-top:4px;border-top:1px solid #eee`);
					const n = document.createElement('span');
					n.setAttribute('style', 'color:#666');
					n.textContent = `${c.name}: `;
					row.append(n, document.createTextNode(c.text));
					card.append(row);
				}
				card.addEventListener('click', () => openPopover(mark, h));
				entries.push({ top: rect.top + window.scrollY, left, el: card });
			}

			entries.sort((a, b) => a.top - b.top);
			let cursor = 0;
			for (const e of entries) {
				cardsLayer.append(e.el);
				const top = Math.max(e.top, cursor);
				e.el.style.left = `${e.left}px`;
				e.el.style.top = `${top}px`;
				cursor = top + e.el.offsetHeight + 8;
			}
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

		// ---- floating UI: selection toolbar + note popover -------------------------------

		// Absolutely positioned in page coordinates so the UI scrolls with the text it is anchored to.
		const root = document.createElement('div');
		root.setAttribute('style', 'position:absolute;z-index:2147483647;top:0;left:0;width:0;height:0');
		document.documentElement.append(root);
		root.append(cardsLayer);
		ctx.onInvalidated(() => {
			for (const c of cleanups) c();
			cleanups = [];
			root.remove();
		});

		const toolbar = document.createElement('div');
		toolbar.setAttribute('style', 'position:absolute;display:none;gap:4px;box-shadow:0 1px 4px rgba(0,0,0,.3);border-radius:4px');
		const hlBtn = document.createElement('button');
		hlBtn.textContent = 'highlight';
		hlBtn.setAttribute('style', BTN);
		const noteBtn = document.createElement('button');
		noteBtn.textContent = '+ note';
		noteBtn.setAttribute('style', BTN);
		toolbar.append(hlBtn, noteBtn);

		const popover = document.createElement('div');
		popover.setAttribute(
			'style',
			`position:absolute;display:none;flex-direction:column;gap:6px;width:280px;padding:8px;background:#fff;${FONT};` +
				'border:1px solid #ddd;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.25)'
		);
		const who = document.createElement('div');
		who.setAttribute('style', 'color:#666;font-size:12px');
		const noteView = document.createElement('div');
		noteView.setAttribute('style', 'white-space:pre-wrap');
		const textarea = document.createElement('textarea');
		textarea.placeholder = 'Your note (shown with the highlight)';
		textarea.rows = 3;
		textarea.setAttribute('style', `${FONT};width:100%;box-sizing:border-box;padding:6px;border:1px solid #ccc;border-radius:4px;resize:vertical;background:#fff`);
		const actions = document.createElement('div');
		actions.setAttribute('style', 'display:flex;gap:6px;justify-content:flex-end');
		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save';
		saveBtn.setAttribute('style', BTN);
		const removeBtn = document.createElement('button');
		removeBtn.textContent = 'Remove';
		removeBtn.setAttribute('style', `${BTN};background:#eee`);
		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.setAttribute('style', `${BTN};background:#eee`);
		actions.append(removeBtn, cancelBtn, saveBtn);
		// Comment thread on an existing highlight
		const commentsBox = document.createElement('div');
		commentsBox.setAttribute('style', 'display:none;flex-direction:column;gap:4px;max-height:200px;overflow:auto;border-top:1px solid #eee;padding-top:6px');
		const replyRow = document.createElement('div');
		replyRow.setAttribute('style', 'display:none;gap:6px');
		const replyInput = document.createElement('input');
		replyInput.placeholder = 'Add a comment…';
		const status = document.createElement('div');
		status.setAttribute('style', 'display:none;color:#c0392b;font-size:12px');
		const showError = (e: unknown) => {
			report(e);
			if (stale(e)) return;
			status.textContent = e instanceof Error ? e.message : String(e);
			status.style.display = 'block';
		};
		replyInput.setAttribute('style', `${FONT};flex:1;padding:5px 6px;border:1px solid #ccc;border-radius:4px;background:#fff`);
		const replyBtn = document.createElement('button');
		replyBtn.textContent = 'Reply';
		replyBtn.setAttribute('style', BTN);
		replyRow.append(replyInput, replyBtn);
		popover.append(who, noteView, textarea, actions, commentsBox, replyRow, status);
		root.append(toolbar, popover);

		function renderComments(h: Hl) {
			commentsBox.replaceChildren();
			const all = lastInfo?.comments ?? [];
			const walk = (type: 'highlight' | 'comment', id: string, depth: number) => {
				for (const c of all.filter((c) => c.subjectType === type && c.subjectId === id)) {
					const row = document.createElement('div');
					row.setAttribute('style', `margin-left:${Math.min(depth, 4) * 10}px`);
					const name = document.createElement('span');
					name.setAttribute('style', 'color:#666;font-size:12px');
					name.textContent = c.mine ? 'you' : c.user.displayName ?? c.user.username;
					const text = document.createElement('div');
					text.setAttribute('style', 'white-space:pre-wrap');
					text.textContent = c.text;
					row.append(name, text);
					if (c.mine) {
						const del = document.createElement('button');
						del.textContent = 'delete';
						del.setAttribute('style', `${FONT};color:#666;font-size:12px;background:none;border:0;padding:0 0 0 6px;cursor:pointer;text-decoration:underline`);
						del.addEventListener('click', async () => {
							await api.deleteComment(c.id).catch(report);
							await paintAll();
							const fresh = byId.get(h.highlight.id);
							if (fresh) renderComments(fresh);
						});
						name.append(del);
					}
					commentsBox.append(row);
					walk('comment', c.id, depth + 1);
				}
			};
			walk('highlight', h.highlight.id, 0);
			commentsBox.style.display = commentsBox.childElementCount ? 'flex' : 'none';
		}

		replyBtn.addEventListener('click', async () => {
			if (!replyInput.value.trim()) return;
			if (!editing) return showError(new Error('Lost track of the highlight; click it again.'));
			const h = editing;
			replyBtn.disabled = true;
			try {
				await api.comment({ subjectType: 'highlight', subjectId: h.highlight.id, text: replyInput.value });
				replyInput.value = '';
				await paintAll();
				const fresh = byId.get(h.highlight.id);
				if (fresh) renderComments(fresh);
			} catch (e) {
				showError(e);
			} finally {
				replyBtn.disabled = false;
			}
		});
		replyInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') replyBtn.click();
			e.stopPropagation();
		});

		let pending: Range | null = null; // current selection, for new highlights
		let editing: Hl | null = null; // existing highlight being viewed/edited
		/** What the visible popover/toolbar is anchored to, so it can follow on scroll/resize. */
		let anchor: Element | Range | null = null;

		function place(el: HTMLElement, rect: DOMRect, display: string) {
			el.style.display = display;
			const w = el.offsetWidth || 280;
			const left = Math.min(Math.max(4, rect.left), window.innerWidth - w - 4);
			const above = rect.top - el.offsetHeight - 8;
			const top = above > 4 ? above : rect.bottom + 8;
			el.style.left = `${left + window.scrollX}px`;
			el.style.top = `${top + window.scrollY}px`;
		}

		function reposition() {
			layoutCards();
			if (!anchor) return;
			const rect = anchor.getBoundingClientRect();
			if (popover.style.display !== 'none') place(popover, rect, 'flex');
			else if (toolbar.style.display !== 'none') place(toolbar, rect, 'flex');
		}
		ctx.addEventListener(window, 'resize', reposition, { passive: true });
		// Late layout shifts (images, fonts) move the text; follow them.
		ctx.addEventListener(window, 'load', layoutCards);
		ctx.setTimeout(layoutCards, 1500);

		function hideAll() {
			toolbar.style.display = 'none';
			popover.style.display = 'none';
			editing = null;
			anchor = null;
		}

		function openPopover(at: Element | Range, h: Hl | null) {
			anchor = at;
			status.style.display = 'none';
			const rect = at.getBoundingClientRect();
			editing = h;
			const own = !h || h.mine;
			who.textContent = h ? (h.mine ? 'your highlight' : `${h.user.displayName ?? h.user.username}'s highlight`) : 'new highlight';
			noteView.textContent = h?.highlight.note ?? '';
			noteView.style.display = !own && h?.highlight.note ? 'block' : 'none';
			textarea.value = h?.highlight.note ?? '';
			textarea.style.display = own ? 'block' : 'none';
			saveBtn.style.display = own ? 'inline-block' : 'none';
			removeBtn.style.display = h?.mine ? 'inline-block' : 'none';
			replyRow.style.display = h ? 'flex' : 'none';
			if (h) renderComments(h);
			else commentsBox.style.display = 'none';
			toolbar.style.display = 'none';
			place(popover, rect, 'flex');
			if (own) textarea.focus();
		}

		async function createHighlight(range: Range, note?: string) {
			const sel = await describeTextQuote(range, document.body);
			await api.highlight({ url: location.href, title: document.title, exact: sel.exact, prefix: sel.prefix, suffix: sel.suffix, note });
			document.getSelection()?.removeAllRanges();
			await paintAll();
			notify();
		}

		ctx.addEventListener(document, 'selectionchange', () => {
			if (popover.style.display !== 'none') return;
			const sel = document.getSelection();
			if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !sel.toString().trim()) {
				toolbar.style.display = 'none';
				pending = null;
				return;
			}
			const range = sel.getRangeAt(0);
			const container = range.commonAncestorContainer;
			const el = container instanceof Element ? container : container.parentElement;
			if (!el || el.closest('input, textarea, [contenteditable]') || root.contains(el)) return;
			pending = range.cloneRange();
			anchor = pending;
			place(toolbar, range.getBoundingClientRect(), 'flex');
		});

		for (const b of [hlBtn, noteBtn, saveBtn, removeBtn, cancelBtn, replyBtn]) b.addEventListener('mousedown', (e) => e.preventDefault());

		hlBtn.addEventListener('click', async () => {
			if (!pending) return;
			const r = pending;
			hideAll();
			await createHighlight(r).catch(report);
		});

		noteBtn.addEventListener('click', () => {
			if (!pending) return;
			openPopover(pending, null);
		});

		saveBtn.addEventListener('click', async () => {
			const note = textarea.value.trim();
			try {
				if (editing) {
					await api.setNote(editing.highlight.id, note || null);
					await paintAll();
				} else if (pending) {
					await createHighlight(pending, note || undefined);
				}
			} catch (e) {
				return showError(e);
			}
			hideAll();
		});

		removeBtn.addEventListener('click', async () => {
			if (!editing?.mine) return;
			await api.deleteHighlight(editing.highlight.id).catch(report);
			hideAll();
			await paintAll();
			notify();
		});

		cancelBtn.addEventListener('click', hideAll);

		ctx.addEventListener(document, 'click', (ev) => {
			const target = ev.target as Element | null;
			if (root.contains(target)) return;
			const mark = target?.closest?.(`mark[${MARK_ATTR}]`);
			if (mark) {
				const h = byId.get(mark.getAttribute(MARK_ATTR)!);
				if (h) {
					ev.preventDefault();
					openPopover(mark, h);
					return;
				}
			}
			if (popover.style.display !== 'none') hideAll();
		});

		ctx.addEventListener(document, 'keydown', (ev) => {
			if (ev.key === 'Escape') hideAll();
		});

		browser.runtime.onMessage.addListener((raw: unknown) => {
			if ((raw as Message).type === 'george:refresh') paintAll();
		});

		await paintAll();
	}
});
