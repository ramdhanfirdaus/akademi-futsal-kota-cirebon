import 'server-only';
import { and, between, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, attendances, classSchedules, classes, students, users } from '../db/schema';
import type { Db } from '../db';
import { invalid, notFound } from '../errors';
import { chunks, id, requiredDate } from '../validation';
import { dayOfWeek, daysBetween, eachDate, isValidDate } from '@/lib/date';
import { activeSchedulesForClass } from './classes';
import { activeStudentsInClass } from './students';

export const MAX_RANGE_DAYS = 93;

const matrixQuery = z
  .object({ class_id: id, start: requiredDate, end: requiredDate })
  .superRefine((q, ctx) => {
    // zod still runs object refinements after a field failed; only compare valid dates.
    if (!isValidDate(q.start) || !isValidDate(q.end)) return;
    if (q.end < q.start) {
      ctx.addIssue({ code: 'custom', message: 'Tanggal selesai harus sama atau setelah tanggal mulai', path: ['end'] });
    } else if (daysBetween(q.start, q.end) > MAX_RANGE_DAYS) {
      ctx.addIssue({ code: 'custom', message: `Rentang maksimal ${MAX_RANGE_DAYS} hari`, path: ['end'] });
    }
  });

const saveSchema = z.object({
  list: z
    .array(
      z.object({
        student_id: id,
        class_schedule_id: id,
        date: requiredDate,
        is_present: z.boolean(),
      }),
    )
    .min(1),
});

export async function getAttendanceMatrix(db: Db, q: Record<string, string | undefined>) {
  const { class_id: classId, start, end } = matrixQuery.parse(q);
  const [cls] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), isNull(classes.deletedAt)));
  if (!cls) throw notFound();

  const schedules = await activeSchedulesForClass(db, classId);
  const byDay = new Map(schedules.map((s) => [s.day_of_week, s]));
  const dates = eachDate(start, end).flatMap((date) => {
    const s = byDay.get(dayOfWeek(date));
    return s ? [{ date, class_schedule_id: s.id, start_time: s.start_time, end_time: s.end_time }] : [];
  });

  const roster = await activeStudentsInClass(db, classId);
  const present = new Set<string>();
  if (roster.length && schedules.length) {
    const rows = await db
      .select({ studentId: attendances.studentId, scheduleId: attendances.classScheduleId, date: attendances.date })
      .from(attendances)
      .where(
        and(
          inArray(attendances.studentId, roster.map((s) => s.id)),
          inArray(attendances.classScheduleId, schedules.map((s) => s.id)),
          between(attendances.date, start, end),
        ),
      );
    for (const r of rows) present.add(`${r.studentId}|${r.scheduleId}|${r.date}`);
  }

  return {
    class_id: classId,
    dates,
    students: roster.map((s) => ({
      student_id: s.id,
      name: s.name,
      attendance: Object.fromEntries(dates.map((d) => [d.date, present.has(`${s.id}|${d.class_schedule_id}|${d.date}`)])),
    })),
  };
}

/** Validates the whole list first (nothing is written if any item is invalid), then applies it in one transaction. */
export async function saveAttendance(db: Db, input: unknown): Promise<void> {
  const { list } = saveSchema.parse(input);

  const scheduleIds = [...new Set(list.map((i) => i.class_schedule_id))];
  const schedules = await db
    .select({ id: classSchedules.id, classId: classSchedules.classId, day: classSchedules.dayOfWeek })
    .from(classSchedules)
    .innerJoin(classes, eq(classes.id, classSchedules.classId))
    .where(and(inArray(classSchedules.id, scheduleIds), isNull(classSchedules.deletedAt), isNull(classes.deletedAt)));
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  const studentIds = [...new Set(list.map((i) => i.student_id))];
  const roster = await db
    .select({ id: students.id, classId: academyStudents.classId })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .where(and(inArray(students.id, studentIds), eq(users.status, 'ACTIVE')));
  const classOfStudent = new Map(roster.map((s) => [s.id, s.classId]));

  const errors: Record<string, string[]> = {};
  list.forEach((item, i) => {
    const schedule = scheduleById.get(item.class_schedule_id);
    if (!schedule) errors[`list.${i}`] = ['Jadwal tidak ditemukan'];
    else if (dayOfWeek(item.date) !== schedule.day) errors[`list.${i}`] = ['Tanggal tidak sesuai dengan hari jadwal'];
    else if (classOfStudent.get(item.student_id) !== schedule.classId) errors[`list.${i}`] = ['Siswa tidak terdaftar di kelas ini'];
  });
  if (Object.keys(errors).length) throw invalid(errors);

  const present = list.filter((i) => i.is_present).map((i) => ({ studentId: i.student_id, classScheduleId: i.class_schedule_id, date: i.date }));
  const absent = list.filter((i) => !i.is_present);

  // Batched writes: one INSERT and one DELETE per chunk instead of one query per cell.
  await db.transaction(async (tx) => {
    for (const part of chunks(present)) await tx.insert(attendances).values(part).onConflictDoNothing();
    for (const part of chunks(absent)) {
      await tx
        .delete(attendances)
        .where(
          sql`(${attendances.studentId}, ${attendances.classScheduleId}, ${attendances.date}) in (${sql.join(
            part.map((i) => sql`(${i.student_id}::int, ${i.class_schedule_id}::int, ${i.date}::date)`),
            sql`, `,
          )})`,
        );
    }
  });
}
