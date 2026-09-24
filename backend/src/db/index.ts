import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { env } from '../config';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const dbPath = path.isAbsolute(env.DATABASE_PATH)
  ? env.DATABASE_PATH
  : path.resolve(PROJECT_ROOT, env.DATABASE_PATH);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export * from './schema';
