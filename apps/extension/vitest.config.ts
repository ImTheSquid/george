import { defineConfig } from 'vitest/config';

// Only the pure helpers in utils/ are unit-tested; entrypoints need a browser.
export default defineConfig({
	test: {
		environment: 'happy-dom',
		include: ['utils/**/*.test.ts']
	}
});
