// Runtime messages between popup, background, and content scripts.
import type { PageInfo } from './api';
import type { SiteVerdict } from './sites';

export type Message =
	| { type: 'george:set-token'; token: string; appUrl: string }
	/** Ask the background to refresh a tab's badge/cache. Content scripts omit tabId (sender.tab has it); the popup must pass it. */
	| { type: 'george:page-changed'; tabId?: number }
	| { type: 'george:refresh' }
	/** Popup asks the background for its cached PageInfo for a tab (instant first render). */
	| { type: 'george:get-page'; tabId: number }
	/** Popup asks the content script whether it is highlighting here, and why. */
	| { type: 'george:site-state' }
	/** Content script on an http:// page borrows the background's SubtleCrypto. */
	| { type: 'george:hash'; url: string };

export type GetPageResponse = { info: PageInfo | null };
export type SiteStateResponse = SiteVerdict;
export type HashResponse = { hash: string };
