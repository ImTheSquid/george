import { storage } from '#imports';
import type { FeedItem } from './api';
import { pageVerdict, urlVerdict, type SiteVerdict } from './sites';

export const DEFAULT_APP_URL = 'https://george.jackhogan.me';

export const tokenItem = storage.defineItem<string | null>('local:token', { fallback: null });
export const appUrlItem = storage.defineItem<string>('local:appUrl', { fallback: DEFAULT_APP_URL });
/** Last feed the new tab page rendered, so it paints before the network answers. */
export const feedCacheItem = storage.defineItem<FeedItem[] | null>('local:feedCache', { fallback: null });
/** Per-host highlight override, keyed by hostname. A missing key means "decide automatically". */
export const sitePrefsItem = storage.defineItem<Record<string, boolean>>('local:sitePrefs', { fallback: {} });

export async function getSettings(): Promise<{ token: string | null; appUrl: string }> {
	const [token, appUrl] = await Promise.all([tokenItem.getValue(), appUrlItem.getValue()]);
	return { token, appUrl: appUrl.replace(/\/$/, '') };
}

export async function setConnection(token: string, appUrl: string): Promise<void> {
	await Promise.all([
		tokenItem.setValue(token),
		appUrlItem.setValue(appUrl.replace(/\/$/, '')),
		feedCacheItem.setValue(null)
	]);
}

export async function disconnect(): Promise<void> {
	await Promise.all([tokenItem.setValue(null), feedCacheItem.setValue(null)]);
}

export function isWebUrl(url: string | undefined): url is string {
	return !!url && /^https?:\/\//.test(url);
}

export function hostnameOf(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return '';
	}
}

/** `undefined` means the user hasn't chosen for this host; the gate decides. */
export async function getSitePref(hostname: string): Promise<boolean | undefined> {
	return (await sitePrefsItem.getValue())[hostname];
}

/** Pass `undefined` to forget the choice and go back to deciding automatically. */
export async function setSitePref(hostname: string, on: boolean | undefined): Promise<void> {
	const prefs = { ...(await sitePrefsItem.getValue()) };
	if (on === undefined) delete prefs[hostname];
	else prefs[hostname] = on;
	await sitePrefsItem.setValue(prefs);
}

/** URL layers only — no document needed, so the background and popup can call it. */
export async function siteVerdictForUrl(url: string): Promise<SiteVerdict> {
	return urlVerdict(url, await getSitePref(hostnameOf(url)));
}

/** Every layer, including the look at the document. Content scripts only. */
export async function siteVerdictForPage(url: string, doc: Document): Promise<SiteVerdict> {
	return pageVerdict(url, await getSitePref(hostnameOf(url)), doc);
}
