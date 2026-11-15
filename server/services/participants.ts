import 'server-only';
import { and, asc, between, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, attendances, classSchedules, classes, payments, students, users } from '../db/schema';
import type { Db } from '../db';
import { dayOfWeek, eachDate, getAge, monthKey } from '@/lib/date';
import { holidayMonthKeys } from './holidays';

const query = z.object({
  class_id: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.coerce.number().int().positive().optional()),
});

const POSITIONS = ['ANCHOR', 'FLANK', 'PIVOT', 'KIPER'] as const;
const AGE_GROUPS: { label: string; max: number }[] = [
  { label: '≤ 8', max: 8 },
  { label: '9–10', max: 10 },
  { label: '11–12', max: 12 },
  { label: '13–14', max: 14 },
  { label: '15–16', max: 16 },
  { label: '17+', max: Infinity },
];

const pct = (part: number, whole: number) => (whole === 0 ? null : Math.round((part / whole) * 1000) / 10);

/**
 * Participant overview for the staff dashboard: who is enrolled, how they are spread over
 * classes, ages and positions, and how this month's attendance and fees are going.
 * Only ACTIVE students in non-deleted classes count.
 */
export async function participantStats(db: Db, today: string, q: Record<string, string | undefined>) {
  const { class_id: classId } = query.parse(q);
  const month = monthKey(today);
  const monthStart = `${month}-01`;
  const year = Number(today.slice(0, 4));

  const classRows = await db
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(isNull(classes.deletedAt), classId ? eq(classes.id, classId) : undefined))
    .orderBy(asc(classes.name), asc(classes.id));
  const classIds = classRows.map((c) => c.id);

  const roster = classIds.length
    ? await db
        .select({
          id: students.id,
          name: students.name,
          gender: students.gender,
          birthDate: students.birthDate,
          classId: academyStudents.classId,
          position: academyStudents.position,
          yearJoin: academyStudents.yearJoin,
          feeStart: academyStudents.feeStart,
        })
        .from(students)
        .innerJoin(users, eq(users.id, students.userId))
        .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
        .where(and(eq(users.status, 'ACTIVE'), inArray(academyStudents.classId, classIds)))
        .orderBy(asc(students.name))
    : [];
  const ids = roster.map((s) => s.id);
  const sizeOf = new Map<number, number>();
  for (const s of roster) sizeOf.set(s.classId, (sizeOf.get(s.classId) ?? 0) + 1);

  // --- Attendance, month to date (holiday months have no sessions) ---
  const isHoliday = (await holidayMonthKeys(db, monthStart, today)).includes(month);
  const meetings = new Map<number, number>();
  const attended = new Map<number, number>();
  if (!isHoliday && ids.length) {
    const schedules = await db
      .select({ id: classSchedules.id, classId: classSchedules.classId, day: classSchedules.dayOfWeek })
      .from(classSchedules)
      .where(and(inArray(classSchedules.classId, classIds), isNull(classSchedules.deletedAt)));
    const scheduleById = new Map(schedules.map((s) => [s.id, s]));
    for (const date of eachDate(monthStart, today)) {
      const dow = dayOfWeek(date);
      for (const s of schedules) if (s.day === dow) meetings.set(s.classId, (meetings.get(s.classId) ?? 0) + (sizeOf.get(s.classId) ?? 0));
    }
    if (schedules.length) {
      const classOf = new Map(roster.map((s) => [s.id, s.classId]));
      const rows = await db
        .select({ studentId: attendances.studentId, scheduleId: attendances.classScheduleId, date: attendances.date })
        .from(attendances)
        .where(and(between(attendances.date, monthStart, today), inArray(attendances.studentId, ids), inArray(attendances.classScheduleId, [...scheduleById.keys()])));
      for (const r of rows) {
        const s = scheduleById.get(r.scheduleId)!;
        if (classOf.get(r.studentId) === s.classId && dayOfWeek(r.date) === s.day) attended.set(s.classId, (attended.get(s.classId) ?? 0) + 1);
      }
    }
  }
  const sum = (m: Map<number, number>) => [...m.values()].reduce((a, b) => a + b, 0);

  // --- Fees for this month ---
  const paidIds = new Set<number>();
  if (!isHoliday && ids.length) {
    const rows = await db
      .select({ studentId: payments.studentId })
      .from(payments)
      .where(and(eq(payments.period, monthStart), inArray(payments.studentId, ids)));
    for (const r of rows) paidIds.add(r.studentId);
  }
  const className = new Map(classRows.map((c) => [c.id, c.name]));
  // Students whose fee only starts after this month owe nothing yet.
  const due = (s: (typeof roster)[number]) => monthKey(s.feeStart) <= month;
  const unpaid = isHoliday ? [] : roster.filter((s) => !paidIds.has(s.id) && due(s));
  const notDue = isHoliday ? 0 : roster.filter((s) => !paidIds.has(s.id) && !due(s)).length;

  // --- Composition ---
  const gender = { MALE: 0, FEMALE: 0, UNKNOWN: 0 };
  const positions = { ...(Object.fromEntries(POSITIONS.map((p) => [p, 0])) as Record<(typeof POSITIONS)[number], number>), UNKNOWN: 0 };
  const ageCounts = new Map<string, number>(AGE_GROUPS.map((g) => [g.label, 0]));
  let noAge = 0;
  const years = new Map<number, number>();
  for (const s of roster) {
    gender[s.gender ?? 'UNKNOWN'] += 1;
    positions[s.position ?? 'UNKNOWN'] += 1;
    years.set(s.yearJoin, (years.get(s.yearJoin) ?? 0) + 1);
    if (!s.birthDate) noAge += 1;
    else {
      const age = getAge(s.birthDate, today);
      const group = AGE_GROUPS.find((g) => age <= g.max)!;
      ageCounts.set(group.label, ageCounts.get(group.label)! + 1);
    }
  }

  return {
    month,
    totals: { active: roster.length, new_this_year: roster.filter((s) => s.yearJoin === year).length, classes: classRows.length },
    attendance: { meetings: sum(meetings), attended: sum(attended), rate: pct(sum(attended), sum(meetings)) },
    payments: { holiday: isHoliday, paid: isHoliday ? 0 : paidIds.size, unpaid: unpaid.length, not_due: notDue },
    by_class: classRows.map((c) => ({
      id: c.id,
      name: c.name,
      students: sizeOf.get(c.id) ?? 0,
      attendance_rate: pct(attended.get(c.id) ?? 0, meetings.get(c.id) ?? 0),
      paid: roster.filter((s) => s.classId === c.id && paidIds.has(s.id)).length,
    })),
    gender,
    positions,
    age_groups: [...AGE_GROUPS.map((g) => ({ label: g.label, count: ageCounts.get(g.label)! })), { label: 'Belum diisi', count: noAge }],
    year_join: [...years.entries()].sort((a, b) => a[0] - b[0]).map(([y, count]) => ({ year: y, count })),
    unpaid_students: unpaid.map((s) => ({ id: s.id, name: s.name, class: className.get(s.classId) ?? '' })),
  };
}

export type ParticipantStats = Awaited<ReturnType<typeof participantStats>>;
