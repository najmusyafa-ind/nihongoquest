// src/lib/db.ts — Drizzle ORM client singleton (server-side only)
// Lazy initialization: db is only created when first accessed, not at import time.
// This allows `next build` to succeed without DATABASE_URL present.

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error(
      '[NihongoQuest] DATABASE_URL is not set. Add it to .env.local before running the app.'
    );
  }

  // Disable prefetch for Supabase transaction mode (PgBouncer compatibility)
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

// Convenience re-export for callers that prefer `db.query.xxx`
// Usage: import { db } from '@/lib/db' — only safe inside server route handlers
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
