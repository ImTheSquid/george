import { defineConfig } from 'wxt';

export default defineConfig({
	modules: ['@wxt-dev/module-svelte'],
	manifest: ({ mode }) => ({
		name: 'george',
		description: 'Save pages and highlights to your george feed; see what your friends saved.',
		permissions: ['storage', 'tabs'],
		// The dev server origin is only needed while developing against `pnpm dev` of the web app.
		host_permissions: ['https://george.jackhogan.me/*', ...(mode === 'development' ? ['http://localhost:5173/*'] : [])],
		commands: {
			'save-link': {
				description: 'Save or unsave the current page',
				suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' }
			}
		}
	})
});
