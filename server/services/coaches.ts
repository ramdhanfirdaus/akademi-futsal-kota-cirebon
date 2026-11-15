import 'server-only';
import { and, asc, count, eq, ilike, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { classes, coaches, users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { forbidden, notFound } from '../errors';
import { nowIso, optLongText, optText, pageMeta, pageQuery, optPassword, password, reqText } from '../validation';
import { createUser, deactivateUser, generateUsername, slugBase, updateUser, withUsernameRetry, type Tx } from './users';

const activeUser = eq(users.status, 'ACTIVE');

export const MAX_PHOTO_BYTES = 500 * 1024;
const PHOTO_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

/** A data URL sets the photo, null removes it, omitted keeps the current one. */
const photoInput = z
  .union([
    z.null(),
    z
      .string()
      .regex(PHOTO_RE, 'Foto harus berupa gambar JPG, PNG, atau WebP')
      .transform((s) => {
        const [, type, b64] = PHOTO_RE.exec(s)!;
        return { type, bytes: Buffer.from(b64, 'base64') };
      })
      .refine((p) => p.bytes.length <= MAX_PHOTO_BYTES, `Ukuran foto maksimal ${MAX_PHOTO_BYTES / 1024} KB`),
  ])
  .optional();

const certificationsInput = z
  .array(z.string().trim().max(255, 'Maksimal 255 karakter'))
  .max(20, 'Maksimal 20 sertifikasi')
  .transform((list) => list.filter(Boolean))
  .optional();

const profile = { experience: optLongText, certifications: certificationsInput, photo: photoInput };

const createSchema = z.object({
  password,
  name: reqText,
  nickname: optText,
  ...profile,
});

const updateSchema = z.object({
  username: z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().regex(/^[a-z0-9._]{3,64}$/).optional()),
  password: optPassword,
  name: reqText,
  nickname: optText,
  ...profile,
});

export type CoachDTO = {
  id: number;
  user_id: number;
  name: string;
  nickname: string | null;
  username: string;
  experience: string | null;
  certifications: string[];
  /** Cache-busted URL of the photo, or null. */
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  classes: { id: number; name: string }[];
};

async function loadCoaches(db: Tx, where: SQL | undefined, page?: { limit: number; offset: number }): Promise<CoachDTO[]> {
  let q = db
    .select({
      // Every column except the photo bytes, which are only read by getCoachPhoto.
      c: {
        id: coaches.id,
        userId: coaches.userId,
        name: coaches.name,
        nickname: coaches.nickname,
        experience: coaches.experience,
        certifications: coaches.certifications,
        createdAt: coaches.createdAt,
        updatedAt: coaches.updatedAt,
      },
      hasPhoto: sql<boolean>`${coaches.photo} is not null`,
      username: users.username,
    })
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
  return rows.map(({ c, username, hasPhoto }) => ({
    id: c.id,
    user_id: c.userId,
    name: c.name,
    nickname: c.nickname,
    username,
    experience: c.experience,
    certifications: c.certifications,
    photo_url: hasPhoto ? coachPhotoUrl(c.id, c.updatedAt) : null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    classes: cls.filter((k) => k.coachId === c.id).map(({ id, name }) => ({ id, name })),
  }));
}

export function coachPhotoUrl(coachId: number, updatedAt: string): string {
  return `/api/coaches/${coachId}/photo?v=${encodeURIComponent(updatedAt)}`;
}

type ProfileInput = { experience?: string | null; certifications?: string[]; photo?: { type: string; bytes: Buffer } | null };

/** Column values for the profile fields that were sent; omitted fields stay unchanged. */
function profileColumns(d: ProfileInput) {
  const set: Partial<typeof coaches.$inferInsert> = {};
  if (d.experience !== undefined) set.experience = d.experience;
  if (d.certifications !== undefined) set.certifications = d.certifications;
  if (d.photo !== undefined) {
    set.photo = d.photo?.bytes ?? null;
    set.photoType = d.photo?.type ?? null;
  }
  return set;
}

/** Photo of an active coach, for the public page. */
export async function getCoachPhoto(db: Db, coachId: number): Promise<{ type: string; bytes: Uint8Array }> {
  const [row] = await db
    .select({ photo: coaches.photo, type: coaches.photoType })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(and(eq(coaches.id, coachId), activeUser));
  if (!row?.photo || !row.type) throw notFound();
  return { type: row.type, bytes: row.photo };
}

async function findCoach(db: Tx, coachId: number): Promise<CoachDTO> {
  const [c] = await loadCoaches(db, eq(coaches.id, coachId));
  if (!c) throw notFound();
  return c;
}

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
  return withUsernameRetry(() => db.transaction(async (tx) => {
    const source = d.nickname || d.name.split(/\s+/)[0];
    const username = await generateUsername(tx, slugBase(source, 'pelatih'));
    const user = await createUser(tx, { username, password: d.password, role: 'COACH' });
    const [c] = await tx
      .insert(coaches)
      .values({ userId: user.id, name: d.name, nickname: d.nickname ?? null, ...profileColumns(d) })
      .returning({ id: coaches.id });
    return findCoach(tx, c.id);
  }));
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
      .set({ name: d.name, nickname: d.nickname ?? null, ...profileColumns(d), updatedAt: nowIso() })
      .where(eq(coaches.id, coachId));
    return findCoach(tx, coachId);
  });
}

export async function deleteCoach(db: Db, coachId: number): Promise<void> {
  const [c] = await db.select({ userId: coaches.userId }).from(coaches).where(eq(coaches.id, coachId));
  if (!c) throw notFound();
  await deactivateUser(db, c.userId);
}
