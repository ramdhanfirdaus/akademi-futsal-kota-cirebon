import 'server-only';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, classSchedules, classes, coaches, students, users } from '../db/schema';
import type { Db } from '../db';
import { conflict, invalid, notFound } from '../errors';
import { id, nowIso } from '../validation';
import { dayOfWeek, todayWIB } from '@/lib/date';
import type { Tx } from './users';

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam HH:MM')
  .transform((t) => (t.length === 5 ? `${t}:00` : t));

const scheduleSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: time,
    end_time: time,
  })
  .refine((s) => s.end_time > s.start_time, { message: 'Jam selesai harus setelah jam mulai', path: ['end_time'] });

const classSchema = z.object({
  name: z.string().trim().min(1).max(255),
  coach_id: id,
  schedules: z.array(scheduleSchema).default([]),
});

export type ScheduleDTO = { id: number; class_id: number; day_of_week: number; start_time: string; end_time: string };
export type ClassDTO = {
  id: number;
  name: string;
  coach_id: number;
  coach: { id: number; name: string; nickname: string | null; username: string };
  schedules: ScheduleDTO[];
  created_at: string;
  updated_at: string;
};

function toScheduleDTO(s: typeof classSchedules.$inferSelect): ScheduleDTO {
  return { id: s.id, class_id: s.classId, day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime };
}

/** Non-deleted schedules of a class, ordered by weekday. */
export async function activeSchedulesForClass(db: Tx, classId: number): Promise<ScheduleDTO[]> {
  const rows = await db
    .select()
    .from(classSchedules)
    .where(and(eq(classSchedules.classId, classId), isNull(classSchedules.deletedAt)))
    .orderBy(asc(classSchedules.dayOfWeek), asc(classSchedules.startTime));
  return rows.map(toScheduleDTO);
}

/** WIB calendar date a soft-deleted schedule was retired on (timestamps are stored as UTC wall time). */
export function retiredOn(deletedAt: string | null): string | null {
  if (!deletedAt) return null;
  const iso = deletedAt.replace(' ', 'T');
  return todayWIB(new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`));
}

export type ScheduleRow = typeof classSchedules.$inferSelect;

/** Every schedule of a class, including retired ones. */
export async function schedulesSince(db: Tx, classId: number): Promise<ScheduleRow[]> {
  return db
    .select()
    .from(classSchedules)
    .where(eq(classSchedules.classId, classId))
    .orderBy(asc(classSchedules.dayOfWeek), asc(classSchedules.startTime));
}

/**
 * The schedule that applied on `date`: a schedule retired after that date wins (it was the one
 * in use then, so its attendance stays visible); otherwise the current schedule for that weekday.
 */
export function scheduleOn(schedules: ScheduleRow[], date: string): ScheduleRow | undefined {
  const weekday = dayOfWeek(date);
  let best: ScheduleRow | undefined;
  let bestEnd = '';
  for (const s of schedules) {
    if (s.dayOfWeek !== weekday) continue;
    const end = retiredOn(s.deletedAt) ?? '9999-12-31';
    if (end <= date) continue;
    if (!best || end < bestEnd) {
      best = s;
      bestEnd = end;
    }
  }
  return best;
}

async function loadClasses(db: Tx, classId?: number): Promise<ClassDTO[]> {
  const rows = await db
    .select({ c: classes, coach: { id: coaches.id, name: coaches.name, nickname: coaches.nickname, username: users.username } })
    .from(classes)
    .innerJoin(coaches, eq(coaches.id, classes.coachId))
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(and(isNull(classes.deletedAt), classId ? eq(classes.id, classId) : undefined))
    .orderBy(asc(classes.name), asc(classes.id));
  const ids = rows.map((r) => r.c.id);
  const scheds = ids.length
    ? await db
        .select()
        .from(classSchedules)
        .where(and(inArray(classSchedules.classId, ids), isNull(classSchedules.deletedAt)))
        .orderBy(asc(classSchedules.dayOfWeek), asc(classSchedules.startTime))
    : [];
  return rows.map(({ c, coach }) => ({
    id: c.id,
    name: c.name,
    coach_id: c.coachId,
    coach,
    schedules: scheds.filter((s) => s.classId === c.id).map(toScheduleDTO),
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }));
}

async function findClass(db: Tx, classId: number): Promise<ClassDTO> {
  const [c] = await loadClasses(db, classId);
  if (!c) throw notFound();
  return c;
}

export function listClasses(db: Db): Promise<ClassDTO[]> {
  return loadClasses(db);
}

async function validate(db: Tx, input: unknown) {
  const d = classSchema.parse(input);
  const ids = d.schedules.flatMap((s) => (s.id ? [s.id] : []));
  if (new Set(ids).size !== ids.length) {
    throw invalid({ schedules: ['Jadwal yang sama tidak boleh dikirim dua kali'] });
  }
  const days = d.schedules.map((s) => s.day_of_week);
  if (new Set(days).size !== days.length) {
    throw invalid({ schedules: ['Satu kelas tidak boleh punya dua jadwal di hari yang sama'] });
  }
  const [coach] = await db
    .select({ id: coaches.id })
    .from(coaches)
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(and(eq(coaches.id, d.coach_id), eq(users.status, 'ACTIVE')));
  if (!coach) throw invalid({ coach_id: ['Pelatih tidak ditemukan'] });
  return d;
}

const scheduleValues = (classId: number, s: z.infer<typeof scheduleSchema>) => ({
  classId,
  dayOfWeek: s.day_of_week,
  startTime: s.start_time,
  endTime: s.end_time,
});

export async function createClass(db: Db, input: unknown): Promise<ClassDTO> {
  return db.transaction(async (tx) => {
    const d = await validate(tx, input);
    const [c] = await tx.insert(classes).values({ name: d.name, coachId: d.coach_id }).returning();
    if (d.schedules.length) await tx.insert(classSchedules).values(d.schedules.map((s) => scheduleValues(c.id, s)));
    return findClass(tx, c.id);
  });
}

/**
 * Diff-based schedule update: sent ids are updated, new entries inserted,
 * missing ones soft-deleted, so attendance history always survives.
 */
export async function updateClass(db: Db, classId: number, input: unknown): Promise<ClassDTO> {
  return db.transaction(async (tx) => {
    await findClass(tx, classId);
    const d = await validate(tx, input);
    const existing = await activeSchedulesForClass(tx, classId);
    const existingIds = new Set(existing.map((s) => s.id));
    for (const s of d.schedules) {
      if (s.id !== undefined && !existingIds.has(s.id)) {
        throw invalid({ schedules: [`Jadwal #${s.id} bukan milik kelas ini`] });
      }
    }

    // A weekday change retires the old row and starts a new one, so past attendance keeps its weekday.
    const dayOf = new Map(existing.map((s) => [s.id, s.day_of_week]));
    const schedules = d.schedules.map((s) => (s.id && dayOf.get(s.id) !== s.day_of_week ? { ...s, id: undefined } : s));

    // Soft-delete removed schedules first so a re-added weekday never collides with the old row.
    const keep = new Set(schedules.flatMap((s) => (s.id ? [s.id] : [])));
    const removed = existing.filter((s) => !keep.has(s.id)).map((s) => s.id);
    if (removed.length) {
      await tx.update(classSchedules).set({ deletedAt: nowIso(), updatedAt: nowIso() }).where(inArray(classSchedules.id, removed));
    }
    for (const s of schedules) {
      if (s.id) {
        await tx
          .update(classSchedules)
          .set({ ...scheduleValues(classId, s), updatedAt: nowIso() })
          .where(eq(classSchedules.id, s.id));
      } else {
        await tx.insert(classSchedules).values(scheduleValues(classId, s));
      }
    }
    await tx.update(classes).set({ name: d.name, coachId: d.coach_id, updatedAt: nowIso() }).where(eq(classes.id, classId));
    return findClass(tx, classId);
  });
}

/** Soft delete; refused while active students are still assigned. */
export async function deleteClass(db: Db, classId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await findClass(tx, classId);
    const [{ n }] = await tx
      .select({ n: count() })
      .from(academyStudents)
      .innerJoin(students, eq(students.id, academyStudents.studentId))
      .innerJoin(users, eq(users.id, students.userId))
      .where(and(eq(academyStudents.classId, classId), eq(users.status, 'ACTIVE')));
    if (n > 0) throw conflict('Kelas masih memiliki siswa aktif. Pindahkan siswa terlebih dahulu.');
    const now = nowIso();
    await tx
      .update(classSchedules)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(classSchedules.classId, classId), isNull(classSchedules.deletedAt)));
    await tx.update(classes).set({ deletedAt: now, updatedAt: now }).where(eq(classes.id, classId));
  });
}
