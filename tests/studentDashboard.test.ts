import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { eq } from 'drizzle-orm';
import { attendances, holidayPeriods, payments, students } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { studentDashboard } from '@/server/services/dashboard';

let db: Db;
let actor: Actor;
let studentId: number;
let monday: number;

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db, { name: 'Fathur Rizki', nickname: 'Fathur' });
  const c = await makeClass(db, { coachId, name: 'B1', schedules: [{ day_of_week: 1, start_time: '16:00', end_time: '18:00' }] });
  monday = c.scheduleIds[0];
  const s = await makeStudent(db, { classId: c.classId, name: 'Budi Santoso', nickname: 'Budi', feeStart: '2026-01-01' });
  studentId = s.studentId;
  actor = { userId: s.userId, role: 'STUDENT', username: 'budi01' };
  // Mondays: Jan 5,12,19,26 · Feb 2,9,16,23 (holiday) · Mar 2,9,16
  await db.insert(holidayPeriods).values({ period: '2026-02-01' });
  await db.insert(attendances).values([
    { studentId, classScheduleId: monday, date: '2026-01-05' },
    { studentId, classScheduleId: monday, date: '2026-01-12' },
    { studentId, classScheduleId: monday, date: '2026-03-02' },
  ]);
  await db.insert(payments).values([
    { studentId, period: '2026-01-01' },
    { studentId, period: '2026-04-01' }, // paid in advance
  ]);
});

describe('student dashboard', () => {
  it('shows who the student is and who coaches the class', async () => {
    const d = await studentDashboard(db, actor, '2026-03-10');
    expect(d).toMatchObject({ name: 'Budi Santoso', nickname: 'Budi', class: { name: 'B1' } });
    expect(d.coach).toEqual({ name: 'Fathur Rizki', nickname: 'Fathur', photo_url: null });
  });

  it('gives a month-by-month record of the year', async () => {
    const d = await studentDashboard(db, actor, '2026-03-10');
    expect(d.months).toHaveLength(12);
    expect(d.months.slice(0, 5)).toEqual([
      { month: '2026-01', attended: 2, meetings: 4, payment: 'PAID' },
      { month: '2026-02', attended: 0, meetings: 0, payment: 'HOLIDAY' },
      { month: '2026-03', attended: 1, meetings: 2, payment: 'UNPAID' }, // Mar 2 and 9 so far
      { month: '2026-04', attended: null, meetings: null, payment: 'PAID' },
      { month: '2026-05', attended: null, meetings: null, payment: 'UPCOMING' },
    ]);
  });

  it('does not count months before the student enrolled', async () => {
    // No records at all, account created on 5 March.
    const c = await makeClass(db, { coachId: (await makeCoach(db)).coachId, schedules: [{ day_of_week: 1, start_time: '16:00', end_time: '18:00' }] });
    const s = await makeStudent(db, { classId: c.classId, name: 'Rizky', feeStart: '2026-03-01' });
    await db.update(students).set({ createdAt: '2026-03-05 10:00:00' }).where(eq(students.id, s.studentId));
    const d = await studentDashboard(db, { userId: s.userId, role: 'STUDENT', username: 'rizky01' }, '2026-03-10');
    expect(d.months.slice(0, 3)).toEqual([
      { month: '2026-01', attended: null, meetings: null, payment: 'NOT_ENROLLED' },
      { month: '2026-02', attended: null, meetings: null, payment: 'NOT_ENROLLED' },
      { month: '2026-03', attended: 0, meetings: 2, payment: 'UNPAID' },
    ]);
  });

  it('lists unpaid months up to now, skipping holidays and paid months', async () => {
    // Jan paid, Feb holiday, Mar unpaid; Apr paid in advance but not due yet.
    expect((await studentDashboard(db, actor, '2026-03-10')).unpaid_months).toEqual(['2026-03']);
  });

  it('includes unpaid months from the previous year', async () => {
    const c = await makeClass(db, { coachId: (await makeCoach(db)).coachId });
    const s = await makeStudent(db, { classId: c.classId, name: 'Dimas', feeStart: '2025-11-01' });
    await db.update(students).set({ createdAt: '2025-11-10 03:00:00' }).where(eq(students.id, s.studentId));
    const d = await studentDashboard(db, { userId: s.userId, role: 'STUDENT', username: 'dimas01' }, '2026-01-20');
    expect(d.unpaid_months).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('finds the next training session', async () => {
    expect((await studentDashboard(db, actor, '2026-03-10')).next_session).toEqual({
      date: '2026-03-16',
      start_time: '16:00',
      end_time: '18:00',
    });
    // A Monday counts as its own next session.
    expect((await studentDashboard(db, actor, '2026-03-16')).next_session?.date).toBe('2026-03-16');
    // Holiday months are skipped.
    expect((await studentDashboard(db, actor, '2026-01-27')).next_session?.date).toBe('2026-03-02');
  });
});
