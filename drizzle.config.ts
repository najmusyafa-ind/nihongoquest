import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Load .env.local first (Next.js convention), then fall back to .env
// drizzle-kit push/migrate reads DIRECT_URL (not DATABASE_URL which uses PgBouncer port 6543).
config({ path: '.env.local' });
config({ path: '.env' });

// drizzle-kit push/migrate requires a DIRECT connection (port 5432).
// PgBouncer transaction pooler (port 6543, DATABASE_URL) cannot run DDL.
// Set DIRECT_URL = postgresql://postgres:PWD@db.<ref>.supabase.co:5432/postgres
const url = process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
} satisfies Config;
