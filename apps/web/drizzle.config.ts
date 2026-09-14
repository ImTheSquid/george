import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: process.env.DATABASE_URL ?? 'data/george.db' },
	verbose: true,
	strict: true
});
