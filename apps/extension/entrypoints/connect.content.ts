// Runs on the george web app. The settings page posts a fresh API token to the
// window; we forward it to the background, which stores it.
import { browser, defineContentScript } from '#imports';
import type { Message } from '@/utils/messages';

export default defineContentScript({
	matches: ['https://george.jackhogan.me/*', ...(import.meta.env.DEV ? ['http://localhost:5173/*'] : [])],
	runAt: 'document_start',
	main(ctx) {
		ctx.addEventListener(window, 'message', (event: MessageEvent) => {
			if (event.source !== window || event.origin !== location.origin) return;
			const d = event.data;
			if (d?.type !== 'george:connect' || typeof d.token !== 'string') return;
			// The origin is taken from the page we are running on, never from the message, so a
			// script injected into the app cannot point the token at somewhere else.
			const msg: Message = { type: 'george:set-token', token: d.token, appUrl: location.origin };
			browser.runtime.sendMessage(msg).then(() => {
				window.postMessage({ type: 'george:connected' }, location.origin);
			});
		});
	}
});
