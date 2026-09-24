import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';

const migrationsFolder = path.resolve(__dirname, '..', '..', 'drizzle');
migrate(db, { migrationsFolder });
console.log('Migrations applied from', migrationsFolder);
