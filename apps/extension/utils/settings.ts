import { storage } from '#imports';
import type { FeedItem } from './api';

export const DEFAULT_APP_URL = 'https://george.jackhogan.me';

export const tokenItem = storage.defineItem<string | null>('local:token', { fallback: null });
export const appUrlItem = storage.defineItem<string>('local:appUrl', { fallback: DEFAULT_APP_URL });
/** Last feed the new tab page rendered, so it paints before the network answers. */
export const feedCacheItem = storage.defineItem<FeedItem[] | null>('local:feedCache', { fallback: null });

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
