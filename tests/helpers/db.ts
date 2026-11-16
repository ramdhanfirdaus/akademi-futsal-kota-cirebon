import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import path from 'node:path';
import * as schema from '@/server/db/schema';
import type { Db } from '@/server/db';

const open: PGlite[] = [];

/** Closes every database created by the current test (called from tests/setup.ts). */
export async function closeTestDbs(): Promise<void> {
  await Promise.all(open.splice(0).map((c) => c.close().catch(() => undefined)));
}

/** Fresh in-memory Postgres with the production migrations applied. */
export async function createTestDb(opts: { onQuery?: (sql: string) => void } = {}): Promise<Db> {
  const client = new PGlite();
  open.push(client);
  const db = drizzle(client, {
    schema,
    logger: opts.onQuery ? { logQuery: (sql: string) => opts.onQuery!(sql) } : false,
  });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  return db as unknown as Db;
}
