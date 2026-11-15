import { defineConfig } from 'drizzle-kit';

// Load .env for local CLI use (no-op when the file is absent, e.g. in CI).
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
