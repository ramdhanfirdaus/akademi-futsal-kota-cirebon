import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { coaches, students, users } from '../db/schema';
import type { Db } from '../db';
import { hashPassword, verifyPassword, type Actor } from '../auth';
import { invalid, notFound } from '../errors';

export async function login(db: Db, username: string, password: string): Promise<Actor | null> {
  if (!username || !password) return null;
  const [u] = await db.select().from(users).where(eq(users.username, username));
  if (!u || u.status !== 'ACTIVE') return null;
  if (!(await verifyPassword(password, u.password))) return null;
  return { userId: u.id, role: u.role, username: u.username, sessionVersion: u.sessionVersion };
}

export async function me(db: Db, actor: Actor) {
  const [u] = await db.select().from(users).where(eq(users.id, actor.userId));
  if (!u) throw notFound();
  const [s] = await db.select({ id: students.id }).from(students).where(eq(students.userId, u.id));
  const [c] = await db.select({ id: coaches.id }).from(coaches).where(eq(coaches.userId, u.id));
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    status: u.status,
    student_id: s?.id ?? null,
    coach_id: c?.id ?? null,
  };
}

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Password lama wajib diisi'),
  new_password: z.string().min(6, 'Password baru minimal 6 karakter').max(72, 'Password maksimal 72 karakter'),
});

/** Changes the password and revokes all sessions; returns the new version for the caller's fresh cookie. */
export async function changePassword(db: Db, actor: Actor, input: unknown): Promise<{ sessionVersion: number }> {
  const data = passwordSchema.parse(input);
  const [u] = await db.select().from(users).where(eq(users.id, actor.userId));
  if (!u) throw notFound();
  if (!(await verifyPassword(data.old_password, u.password))) {
    throw invalid({ old_password: ['Password lama salah'] });
  }
  const [row] = await db
    .update(users)
    .set({
      password: await hashPassword(data.new_password),
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, u.id))
    .returning({ sessionVersion: users.sessionVersion });
  return { sessionVersion: row.sessionVersion };
}
