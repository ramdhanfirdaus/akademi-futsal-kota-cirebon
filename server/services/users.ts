import 'server-only';
import { eq, like } from 'drizzle-orm';
import { users } from '../db/schema';
import type { Db } from '../db';
import { hashPassword, type Role } from '../auth';
import { nowIso } from '../validation';

/** A database handle or an open transaction. */
export type Tx = Pick<Db, 'select' | 'insert' | 'update' | 'delete' | 'execute'>;

/** Lower-case ASCII slug of the first usable word(s) of a nickname, or the fallback. */
export function slugBase(nickname: string | null | undefined, fallback: 'siswa' | 'pelatih' | 'admin'): string {
  const ascii = (nickname ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
  const slug = ascii.replace(/[^a-z0-9]/g, '');
  return (slug || fallback).slice(0, 20);
}

/** First free `<base>01`, `<base>02`, … username. */
export async function generateUsername(tx: Tx, base: string): Promise<string> {
  const rows = await tx.select({ username: users.username }).from(users).where(like(users.username, `${base}%`));
  const taken = new Set(rows.map((r) => r.username));
  for (let n = 1; ; n++) {
    const candidate = `${base}${String(n).padStart(2, '0')}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function createUser(tx: Tx, data: { username: string; password: string; role: Role }) {
  const [u] = await tx
    .insert(users)
    .values({ username: data.username, password: await hashPassword(data.password), role: data.role })
    .returning();
  return u;
}

/** Empty / missing password leaves the current one unchanged. */
export async function updateUser(tx: Tx, userId: number, data: { username?: string | null; password?: string | null }) {
  const set: Partial<typeof users.$inferInsert> = { updatedAt: nowIso() };
  if (data.username) set.username = data.username;
  if (data.password) set.password = await hashPassword(data.password);
  await tx.update(users).set(set).where(eq(users.id, userId));
}

export async function deactivateUser(tx: Tx, userId: number) {
  await tx.update(users).set({ status: 'INACTIVE', updatedAt: nowIso() }).where(eq(users.id, userId));
}
