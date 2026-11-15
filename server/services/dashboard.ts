import 'server-only';
import { and, between, count, eq, inArray, isNull } from 'drizzle-orm';
import { academyStudents, attendances, classSchedules, classes, coaches, payments, students, users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { notFound } from '../errors';
import { dayOfWeek, eachDate, monthKey } from '@/lib/date';
import { activeSchedulesForClass, type ScheduleDTO } from './classes';
import { holidayMonthKeys } from './holidays';

/**
 * Expected meetings vs. attended meetings in [start, end], skipping holiday months,
 * using only non-deleted schedules/classes and ACTIVE students.
 */
async function attendanceTotals(db: Db, start: string, end: string, onlyStudentId?: number) {
  if (end < start) return { meetings: 0, attended: 0 };

  const roster = await db
    .select({ studentId: students.id, classId: academyStudents.classId })
    .from(students)
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .innerJoin(classes, eq(classes.id, academyStudents.classId))
    .where(and(eq(users.status, 'ACTIVE'), isNull(classes.deletedAt), onlyStudentId ? eq(students.id, onlyStudentId) : undefined));
  if (!roster.length) return { meetings: 0, attended: 0 };

  const classOf = new Map(roster.map((r) => [r.studentId, r.classId]));
  const classSize = new Map<number, number>();
  for (const r of roster) classSize.set(r.classId, (classSize.get(r.classId) ?? 0) + 1);

  const schedules = await db
    .select({ id: classSchedules.id, classId: classSchedules.classId, day: classSchedules.dayOfWeek })
    .from(classSchedules)
    .where(and(inArray(classSchedules.classId, [...classSize.keys()]), isNull(classSchedules.deletedAt)));
  if (!schedules.length) return { meetings: 0, attended: 0 };
  const scheduleById = new Map(schedules.map((s) => [s.id, s]));

  const holidays = new Set(await holidayMonthKeys(db, start, end));
  let meetings = 0;
  for (const date of eachDate(start, end)) {
    if (holidays.has(monthKey(date))) continue;
    const dow = dayOfWeek(date);
    for (const s of schedules) if (s.day === dow) meetings += classSize.get(s.classId) ?? 0;
  }

  const rows = await db
    .select({ studentId: attendances.studentId, scheduleId: attendances.classScheduleId, date: attendances.date })
    .from(attendances)
    .where(
      and(
        between(attendances.date, start, end),
        inArray(attendances.classScheduleId, [...scheduleById.keys()]),
        inArray(attendances.studentId, [...classOf.keys()]),
      ),
    );
  const attended = rows.filter((r) => {
    const s = scheduleById.get(r.scheduleId)!;
    return !holidays.has(monthKey(r.date)) && classOf.get(r.studentId) === s.classId && dayOfWeek(r.date) === s.day;
  }).length;

  return { meetings, attended };
}

export async function dashboardSummary(db: Db, today: string) {
  const activeUser = eq(users.status, 'ACTIVE');
  const [{ totalStudents }] = await db.select({ totalStudents: count() }).from(students).innerJoin(users, eq(users.id, students.userId)).where(activeUser);
  const [{ totalCoaches }] = await db.select({ totalCoaches: count() }).from(coaches).innerJoin(users, eq(users.id, coaches.userId)).where(activeUser);
  const [{ totalClasses }] = await db.select({ totalClasses: count() }).from(classes).where(isNull(classes.deletedAt));

  const { meetings, attended } = await attendanceTotals(db, `${today.slice(0, 4)}-01-01`, today);
  const average = meetings === 0 ? 0 : Math.round((attended / meetings) * 10000) / 100;

  return {
    total_students: totalStudents,
    total_coaches: totalCoaches,
    total_classes: totalClasses,
    average_attendance: average,
  };
}

export async function studentDashboard(db: Db, actor: Actor, today: string) {
  const [s] = await db
    .select({ id: students.id, classId: academyStudents.classId, className: classes.name, classDeleted: classes.deletedAt })
    .from(students)
    .leftJoin(academyStudents, eq(academyStudents.studentId, students.id))
    .leftJoin(classes, eq(classes.id, academyStudents.classId))
    .where(eq(students.userId, actor.userId));
  if (!s) throw notFound();

  const month = monthKey(today);
  const hasClass = s.classId !== null && s.classDeleted === null;
  const schedules: ScheduleDTO[] = hasClass ? await activeSchedulesForClass(db, s.classId!) : [];
  const { meetings, attended } = await attendanceTotals(db, `${month}-01`, today, s.id);

  const holidays = await holidayMonthKeys(db, `${month}-01`, today);
  let payment_status: 'PAID' | 'UNPAID' | 'HOLIDAY' = 'UNPAID';
  if (holidays.includes(month)) payment_status = 'HOLIDAY';
  else {
    const [p] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.studentId, s.id), eq(payments.period, `${month}-01`)));
    if (p) payment_status = 'PAID';
  }

  return {
    class: hasClass ? { id: s.classId!, name: s.className! } : null,
    schedules,
    month,
    attended,
    meetings,
    payment_status,
  };
}
