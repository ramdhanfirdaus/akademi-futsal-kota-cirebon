import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { attendances, payments, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { dashboardSummary, studentDashboard } from '@/server/services/dashboard';
import { createHoliday } from '@/server/services/holidays';

let db: Db;
let classId: number;
let mondayId: number;
let a: { studentId: number; userId: number };
let b: { studentId: number; userId: number };

const attend = (studentId: number, date: string) => db.insert(attendances).values({ studentId, classScheduleId: mondayId, date });

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  const c = await makeClass(db, { coachId, name: 'A', schedules: [{ day_of_week: 1, start_time: '16:00', end_time: '18:00' }] });
  classId = c.classId;
  mondayId = c.scheduleIds[0];
  a = await makeStudent(db, { classId, name: 'A' });
  b = await makeStudent(db, { classId, name: 'B' });
});

describe('dashboard summary', () => {
  it('works with no holidays', async () => {
    const s = await dashboardSummary(db, '2026-01-12');
    expect(s).toMatchObject({ total_students: 2, total_coaches: 1, total_classes: 1 });
  });

  it('computes the average attendance', async () => {
    // Mondays 2026-01-05 and 2026-01-12 → 2 meetings × 2 students = 4 expected
    await attend(a.studentId, '2026-01-05');
    await attend(a.studentId, '2026-01-12');
    await attend(b.studentId, '2026-01-05');
    expect((await dashboardSummary(db, '2026-01-12')).average_attendance).toBe(75);
  });

  it('excludes holiday months from the average', async () => {
    await createHoliday(db, { period: '2026-01' });
    await attend(a.studentId, '2026-01-05');
    await attend(a.studentId, '2026-02-02');
    // Feb Mondays up to 02-09: 02-02, 02-09 → 4 expected, 1 attended
    expect((await dashboardSummary(db, '2026-02-09')).average_attendance).toBe(25);
  });

  it('does not count inactive students', async () => {
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, b.userId));
    await attend(a.studentId, '2026-01-05');
    await attend(b.studentId, '2026-01-05');
    const s = await dashboardSummary(db, '2026-01-05');
    expect(s.total_students).toBe(1);
    expect(s.average_attendance).toBe(100);
  });

  it('returns 0 when there are no meetings', async () => {
    expect((await dashboardSummary(db, '2026-01-01')).average_attendance).toBe(0);
  });
});

describe('student dashboard', () => {
  it('shows class, attendance and payment for this month', async () => {
    await attend(a.studentId, '2026-11-02');
    await db.insert(payments).values({ studentId: a.studentId, period: '2026-11-01' });
    const d = await studentDashboard(db, { userId: a.userId, role: 'STUDENT', username: 'x' }, '2026-11-09');
    expect(d).toMatchObject({
      class: { id: classId, name: 'A' },
      month: '2026-11',
      attended: 1,
      meetings: 2,
      payment_status: 'PAID',
    });
    expect(d.schedules).toHaveLength(1);
  });

  it('reports holiday payment status', async () => {
    await createHoliday(db, { period: '2026-11' });
    const d = await studentDashboard(db, { userId: b.userId, role: 'STUDENT', username: 'x' }, '2026-11-09');
    expect(d.payment_status).toBe('HOLIDAY');
  });
});
