import path from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config';

async function run() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const db = drizzle(pool);
  const migrationsFolder = path.resolve(__dirname, '..', '..', 'drizzle');
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log('Migrations applied from', migrationsFolder);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
