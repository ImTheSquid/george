import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { config } from '$lib/server/config';
import * as schema from './schema';

mkdirSync(dirname(resolve(config.databaseUrl)), { recursive: true });

const client = new Database(config.databaseUrl);
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema, casing: 'snake_case' });

migrate(db, { migrationsFolder: resolve('drizzle') });
