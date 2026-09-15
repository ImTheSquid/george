// Runtime messages between popup, background, and content scripts.
export type Message =
	| { type: 'george:set-token'; token: string; appUrl: string }
	| { type: 'george:page-changed' }
	| { type: 'george:refresh' };
