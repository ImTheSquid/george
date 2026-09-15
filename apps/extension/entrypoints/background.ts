import { browser, defineBackground } from '#imports';
import { api, NotConnected, type PageInfo } from '@/utils/api';
import { getSettings, isWebUrl, setConnection } from '@/utils/settings';
import type { GetPageResponse, Message } from '@/utils/messages';

export default defineBackground(() => {
	// Latest PageInfo per tab, so the popup can render before its own fetch returns.
	const cache = new Map<number, PageInfo>();
	browser.tabs.onRemoved.addListener((tabId) => cache.delete(tabId));

	async function setBadge(tabId: number, text: string, color = '#b8860b') {
		await browser.action.setBadgeText({ tabId, text });
		await browser.action.setBadgeBackgroundColor({ tabId, color });
	}

	/** Badge: ✓ if I saved this page, otherwise how many friends did. */
	async function refreshBadge(tabId: number, url?: string) {
		if (!isWebUrl(url)) return setBadge(tabId, '');
		const { token } = await getSettings();
		if (!token) return setBadge(tabId, '');
		try {
			const info = await api.page(url);
			cache.set(tabId, info);
			if (info.mine) return setBadge(tabId, '✓');
			return setBadge(tabId, info.friends.length ? String(info.friends.length) : '', '#6877d0');
		} catch {
			return setBadge(tabId, '');
		}
	}

	async function toggleSave(tab: Browser.tabs.Tab) {
		if (!tab.id || !isWebUrl(tab.url)) return;
		const { token, appUrl } = await getSettings();
		if (!token) {
			await browser.tabs.create({ url: `${appUrl}/settings` });
			return;
		}
		try {
			const info = await api.page(tab.url);
			if (info.mine) await api.unsave(tab.url);
			else await api.save({ url: tab.url, title: tab.title });
			await refreshBadge(tab.id, tab.url);
			browser.tabs.sendMessage(tab.id, { type: 'george:refresh' } satisfies Message).catch(() => {});
		} catch (e) {
			if (e instanceof NotConnected) await browser.tabs.create({ url: `${appUrl}/settings` });
			else console.error('[george]', e);
		}
	}

	browser.tabs.onActivated.addListener(async ({ tabId }) => {
		const tab = await browser.tabs.get(tabId).catch(() => null);
		if (tab) refreshBadge(tabId, tab.url);
	});
	browser.tabs.onUpdated.addListener((tabId, change, tab) => {
		if (change.status === 'complete' || change.url) refreshBadge(tabId, tab.url);
	});

	browser.commands.onCommand.addListener(async (command) => {
		if (command !== 'save-link') return;
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
		if (tab) toggleSave(tab);
	});

	browser.runtime.onMessage.addListener((raw: unknown, sender) => {
		const msg = raw as Message;
		if (msg.type === 'george:set-token') {
			return setConnection(msg.token, msg.appUrl).then(() => ({ ok: true }));
		}
		if (msg.type === 'george:page-changed' && sender.tab?.id) {
			return refreshBadge(sender.tab.id, sender.tab.url).then(() => ({ ok: true }));
		}
		if (msg.type === 'george:get-page') {
			return Promise.resolve({ info: cache.get(msg.tabId) ?? null } satisfies GetPageResponse);
		}
	});
});
