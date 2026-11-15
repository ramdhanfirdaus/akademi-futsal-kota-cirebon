import 'server-only';
import { and, between, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import { academyStudents, attendances, classSchedules, classes, coaches, payments, students, users } from '../db/schema';
import type { Db } from '../db';
import type { Actor } from '../auth';
import { notFound } from '../errors';
import { addDays, dayOfWeek, eachDate, monthKey, monthKeysBetween } from '@/lib/date';
import { activeSchedulesForClass, retiredOn, type ScheduleDTO } from './classes';
import { holidayMonthKeys } from './holidays';
import { coachPhotoUrl } from './coaches';

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
    .select({ id: students.id, classId: academyStudents.classId, className: classes.name, classDeleted: classes.deletedAt, feeStart: academyStudents.feeStart })
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
  const [profile] = await db
    .select({ name: students.name, nickname: students.nickname, createdAt: students.createdAt })
    .from(students)
    .where(eq(students.id, s.id));
  const since = await enrolledSince(db, s.id, profile.createdAt, s.feeStart);
  const feeMonth = s.feeStart ? monthKey(s.feeStart) : since;

  let payment_status: 'PAID' | 'UNPAID' | 'HOLIDAY' | 'NOT_DUE' = 'UNPAID';
  if (holidays.includes(month)) payment_status = 'HOLIDAY';
  else {
    const [p] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.studentId, s.id), eq(payments.period, `${month}-01`)));
    if (p) payment_status = 'PAID';
    else if (month < feeMonth) payment_status = 'NOT_DUE';
  }

  const coach = hasClass ? await classCoach(db, s.classId!) : null;
  const year = await yearRecord(db, s.id, schedules, today, since, feeMonth);

  return {
    name: profile.name,
    nickname: profile.nickname,
    class: hasClass ? { id: s.classId!, name: s.className! } : null,
    coach,
    schedules,
    next_session: nextSession(schedules, today, new Set(await holidayMonthKeys(db, today, addDays(today, 120)))),
    month,
    attended,
    meetings,
    payment_status,
    months: year,
    unpaid_months: await unpaidMonths(db, s.id, feeMonth, today),
  };
}

async function classCoach(db: Db, classId: number) {
  const [c] = await db
    .select({ id: coaches.id, name: coaches.name, nickname: coaches.nickname, updatedAt: coaches.updatedAt, hasPhoto: sql<boolean>`${coaches.photo} is not null` })
    .from(classes)
    .innerJoin(coaches, eq(coaches.id, classes.coachId))
    .innerJoin(users, eq(users.id, coaches.userId))
    .where(and(eq(classes.id, classId), eq(users.status, 'ACTIVE')));
  return c ? { name: c.name, nickname: c.nickname, photo_url: c.hasPhoto ? coachPhotoUrl(c.id, c.updatedAt) : null } : null;
}

/** First scheduled session on or after today, skipping holiday months (looks ~4 months ahead). */
function nextSession(schedules: ScheduleDTO[], today: string, holidays: Set<string>) {
  if (!schedules.length) return null;
  for (let i = 0; i <= 120; i++) {
    const date = addDays(today, i);
    if (holidays.has(monthKey(date))) continue;
    const s = schedules.find((x) => x.day_of_week === dayOfWeek(date));
    if (s) return { date, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) };
  }
  return null;
}

/**
 * Month the student's record starts: the earliest of account creation, fee start, first attendance
 * and first payment (data entered for earlier months still counts).
 */
async function enrolledSince(db: Db, studentId: number, createdAt: string, feeStart: string | null): Promise<string> {
  const [a] = await db.select({ first: sql<string | null>`min(${attendances.date})` }).from(attendances).where(eq(attendances.studentId, studentId));
  const [p] = await db.select({ first: sql<string | null>`min(${payments.period})` }).from(payments).where(eq(payments.studentId, studentId));
  const candidates = [monthKey(retiredOn(createdAt)!), feeStart && monthKey(feeStart), a?.first && monthKey(String(a.first)), p?.first && monthKey(String(p.first))].filter(Boolean) as string[];
  return candidates.sort()[0];
}

/** Every month from the fee start up to the current one that is neither paid nor a holiday (oldest first). */
async function unpaidMonths(db: Db, studentId: number, since: string, today: string): Promise<string[]> {
  const start = `${since}-01`;
  const holidays = new Set(await holidayMonthKeys(db, start, today));
  const paid = new Set(
    (
      await db
        .select({ period: payments.period })
        .from(payments)
        .where(and(eq(payments.studentId, studentId), between(payments.period, start, today)))
    ).map((p) => monthKey(p.period)),
  );
  return monthKeysBetween(start, today).filter((m) => !holidays.has(m) && !paid.has(m));
}

export type MonthRecord = {
  month: string;
  /** null for months that have not started yet */
  attended: number | null;
  meetings: number | null;
  /** NOT_DUE: enrolled, but before the month the fee starts. */
  payment: 'PAID' | 'UNPAID' | 'HOLIDAY' | 'UPCOMING' | 'NOT_ENROLLED' | 'NOT_DUE';
};

/** January–December of today's year: sessions held vs attended (to date) and fee status per month. */
async function yearRecord(
  db: Db,
  studentId: number,
  schedules: ScheduleDTO[],
  today: string,
  since: string,
  feeMonth: string,
): Promise<MonthRecord[]> {
  const y = today.slice(0, 4);
  const yearStart = `${y}-01-01`;
  const yearEnd = `${y}-12-31`;
  const current = monthKey(today);
  const holidays = new Set(await holidayMonthKeys(db, yearStart, yearEnd));
  const paid = new Set(
    (
      await db
        .select({ period: payments.period })
        .from(payments)
        .where(and(eq(payments.studentId, studentId), between(payments.period, yearStart, yearEnd)))
    ).map((p) => monthKey(p.period)),
  );
  const byId = new Map(schedules.map((s) => [s.id, s]));
  const attendedDates = byId.size
    ? await db
        .select({ date: attendances.date, scheduleId: attendances.classScheduleId })
        .from(attendances)
        .where(and(eq(attendances.studentId, studentId), between(attendances.date, yearStart, today), inArray(attendances.classScheduleId, [...byId.keys()])))
    : [];

  return Array.from({ length: 12 }, (_, i) => {
    const month = `${y}-${String(i + 1).padStart(2, '0')}`;
    if (month < since) return { month, attended: null, meetings: null, payment: 'NOT_ENROLLED' as const };
    const holiday = holidays.has(month);
    const payment: MonthRecord['payment'] = holiday
      ? 'HOLIDAY'
      : paid.has(month)
        ? 'PAID'
        : month < feeMonth
          ? 'NOT_DUE'
          : month > current
            ? 'UPCOMING'
            : 'UNPAID';
    if (month > current) return { month, attended: null, meetings: null, payment };
    if (holiday) return { month, attended: 0, meetings: 0, payment };
    const end = month === current ? today : lastDay(month);
    let meetings = 0;
    for (const date of eachDate(`${month}-01`, end)) if (schedules.some((s) => s.day_of_week === dayOfWeek(date))) meetings += 1;
    const attended = attendedDates.filter((a) => monthKey(a.date) === month && byId.get(a.scheduleId)?.day_of_week === dayOfWeek(a.date)).length;
    return { month, attended, meetings, payment };
  });
}

function lastDay(month: string): string {
  // Day 0 of the next month is the last day of this one.
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
