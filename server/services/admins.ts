import 'server-only';
import { and, asc, count, eq, ilike, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { conflict, notFound } from '../errors';
import { optPassword, pageMeta, pageQuery, password } from '../validation';
import { createUser, deactivateUser, updateUser } from './users';

const username = z.string().trim().regex(/^[a-z0-9._]{3,64}$/, 'Username 3-64 karakter: huruf kecil, angka, titik, garis bawah');

const createSchema = z.object({ username, password });
const updateSchema = z.object({ username, password: optPassword });

const columns = { id: users.id, username: users.username, role: users.role, status: users.status, created_at: users.createdAt, updated_at: users.updatedAt };

const isActiveAdmin = and(eq(users.role, 'ADMIN'), eq(users.status, 'ACTIVE'));

export async function listAdmins(db: Db, q: Record<string, string | undefined>) {
  const page = pageQuery.parse(q);
  const filters: (SQL | undefined)[] = [isActiveAdmin];
  if (q.username) filters.push(ilike(users.username, `%${q.username}%`));
  const where = and(...filters);
  const [{ total }] = await db.select({ total: count() }).from(users).where(where);
  const items = await db
    .select(columns)
    .from(users)
    .where(where)
    .orderBy(asc(users.username))
    .limit(page.limit)
    .offset((page.page - 1) * page.limit);
  return { items, meta: pageMeta(page, total) };
}

async function findAdmin(db: Db, userId: number) {
  const [u] = await db.select(columns).from(users).where(and(eq(users.id, userId), eq(users.role, 'ADMIN')));
  if (!u) throw notFound();
  return u;
}

export async function createAdmin(db: Db, input: unknown) {
  const d = createSchema.parse(input);
  const u = await createUser(db, { username: d.username, password: d.password, role: 'ADMIN' });
  return findAdmin(db, u.id);
}

export async function updateAdmin(db: Db, userId: number, input: unknown) {
  await findAdmin(db, userId);
  const d = updateSchema.parse(input);
  await updateUser(db, userId, d);
  return findAdmin(db, userId);
}

export async function deleteAdmin(db: Db, actor: Actor, userId: number): Promise<void> {
  if (actor.userId === userId) throw conflict('Tidak bisa menghapus akun sendiri');
  await findAdmin(db, userId);
  await deactivateUser(db, userId);
}
