import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | null = null;

/** Lazily-created database connection (one small pool per server instance). */
export function getDb(): Db {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    const pool = new Pool({ connectionString, max: 3 });
    instance = drizzle(pool, { schema }) as unknown as Db;
  }
  return instance;
}

export { schema };
