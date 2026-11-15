import 'server-only';
import { and, asc, count, eq, ilike, inArray, isNull, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { classes, coaches, users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { forbidden, notFound } from '../errors';
import { nowIso, optText, pageMeta, pageQuery } from '../validation';
import { createUser, deactivateUser, generateUsername, slugBase, updateUser, type Tx } from './users';

const createSchema = z.object({
  password: z.string().min(1),
  name: z.string().trim().min(1),
  nickname: optText,
});

const updateSchema = z.object({
  username: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().regex(/^[a-z0-9._]{3,64}$/).optional()),
  password: z.string().nullable().optional(),
  name: z.string().trim().min(1),
  nickname: optText,
});

export type CoachDTO = {
  id: number;
  user_id: number;
  name: string;
  nickname: string | null;
  username: string;
  created_at: string;
  updated_at: string;
  classes: { id: number; name: string }[];
};

async function loadCoaches(db: Tx, where: SQL | undefined, page?: { limit: number; offset: number }): Promise<CoachDTO[]> {
  let q = db
    .select({ c: coaches, username: users.username })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(where)
    .orderBy(asc(coaches.name), asc(coaches.id))
    .$dynamic();
  if (page) q = q.limit(page.limit).offset(page.offset);
  const rows = await q;
  const ids = rows.map((r) => r.c.id);
  const cls = ids.length
    ? await db
        .select({ id: classes.id, name: classes.name, coachId: classes.coachId })
        .from(classes)
        .where(and(inArray(classes.coachId, ids), isNull(classes.deletedAt)))
        .orderBy(asc(classes.name))
    : [];
  return rows.map(({ c, username }) => ({
    id: c.id,
    user_id: c.userId,
    name: c.name,
    nickname: c.nickname,
    username,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    classes: cls.filter((k) => k.coachId === c.id).map(({ id, name }) => ({ id, name })),
  }));
}

async function findCoach(db: Tx, coachId: number): Promise<CoachDTO> {
  const [c] = await loadCoaches(db, eq(coaches.id, coachId));
  if (!c) throw notFound();
  return c;
}

const activeUser = eq(users.status, 'ACTIVE');

export async function listCoaches(db: Db, q: Record<string, string | undefined>) {
  const page = pageQuery.parse(q);
  const filters: SQL[] = [activeUser];
  if (q.name) filters.push(ilike(coaches.name, `%${q.name}%`));
  if (q.nickname) filters.push(ilike(coaches.nickname, `%${q.nickname}%`));
  const where = and(...filters);
  const [{ total }] = await db.select({ total: count() }).from(coaches).innerJoin(users, eq(users.id, coaches.userId)).where(where);
  const items = await loadCoaches(db, where, { limit: page.limit, offset: (page.page - 1) * page.limit });
  return { items, meta: pageMeta(page, total) };
}

export function allActiveCoaches(db: Db): Promise<CoachDTO[]> {
  return loadCoaches(db, activeUser);
}

export function getCoach(db: Db, _actor: Actor, coachId: number): Promise<CoachDTO> {
  return findCoach(db, coachId);
}

export async function createCoach(db: Db, input: unknown): Promise<CoachDTO> {
  const d = createSchema.parse(input);
  return db.transaction(async (tx) => {
    const source = d.nickname || d.name.split(/\s+/)[0];
    const username = await generateUsername(tx, slugBase(source, 'pelatih'));
    const user = await createUser(tx, { username, password: d.password, role: 'COACH' });
    const [c] = await tx.insert(coaches).values({ userId: user.id, name: d.name, nickname: d.nickname ?? null }).returning();
    return findCoach(tx, c.id);
  });
}

/** A coach may only edit their own record; admins may edit any. */
export async function updateCoach(db: Db, actor: Actor, coachId: number, input: unknown): Promise<CoachDTO> {
  const current = await findCoach(db, coachId);
  if (actor.role === 'COACH' && current.user_id !== actor.userId) throw forbidden();
  const d = updateSchema.parse(input);
  return db.transaction(async (tx) => {
    await updateUser(tx, current.user_id, { username: d.username, password: d.password });
    await tx
      .update(coaches)
      .set({ name: d.name, nickname: d.nickname ?? null, updatedAt: nowIso() })
      .where(eq(coaches.id, coachId));
    return findCoach(tx, coachId);
  });
}

export async function deleteCoach(db: Db, coachId: number): Promise<void> {
  const [c] = await db.select({ userId: coaches.userId }).from(coaches).where(eq(coaches.id, coachId));
  if (!c) throw notFound();
  await deactivateUser(db, c.userId);
}
