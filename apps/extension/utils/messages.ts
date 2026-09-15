// Runtime messages between popup, background, and content scripts.
import type { PageInfo } from './api';

export type Message =
	| { type: 'george:set-token'; token: string; appUrl: string }
	| { type: 'george:page-changed' }
	| { type: 'george:refresh' }
	/** Popup asks the background for its cached PageInfo for a tab (instant first render). */
	| { type: 'george:get-page'; tabId: number };

export type GetPageResponse = { info: PageInfo | null };
