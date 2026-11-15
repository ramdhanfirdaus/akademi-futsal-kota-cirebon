import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { academyStudents, attendances, holidayPeriods, payments, students, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { participantStats } from '@/server/services/participants';

// Today is Thursday 2026-11-12; Saturdays this month so far: 7th. Mondays: 2nd, 9th.
const TODAY = '2026-11-12';
const sat = { day_of_week: 6, start_time: '08:00', end_time: '10:00' };
const mon = { day_of_week: 1, start_time: '16:00', end_time: '18:00' };

let db: Db;
let a: { classId: number; scheduleIds: number[] };
let b: { classId: number; scheduleIds: number[] };
let s1: number, s2: number, s3: number;

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  a = await makeClass(db, { coachId, name: 'A', schedules: [sat] });
  b = await makeClass(db, { coachId, name: 'B', schedules: [mon] });
  ({ studentId: s1 } = await makeStudent(db, { classId: a.classId, name: 'Budi' }));
  ({ studentId: s2 } = await makeStudent(db, { classId: a.classId, name: 'Rizky' }));
  ({ studentId: s3 } = await makeStudent(db, { classId: b.classId, name: 'Dimas' }));
  await db.update(students).set({ gender: 'MALE', birthDate: '2016-01-01' }).where(eq(students.id, s1)); // 10
  await db.update(students).set({ gender: 'FEMALE', birthDate: '2012-12-01' }).where(eq(students.id, s2)); // 13
  await db.update(academyStudents).set({ position: 'KIPER', yearJoin: 2026 }).where(eq(academyStudents.studentId, s2));
  // An inactive student is ignored everywhere.
  const gone = await makeStudent(db, { classId: a.classId, name: 'Lama' });
  await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, gone.userId));
});

describe('participantStats', () => {
  it('summarises active students across all classes', async () => {
    await db.insert(attendances).values([
      { studentId: s1, classScheduleId: a.scheduleIds[0], date: '2026-11-07' },
      { studentId: s3, classScheduleId: b.scheduleIds[0], date: '2026-11-02' },
    ]);
    await db.insert(payments).values([{ studentId: s1, period: '2026-11-01' }]);

    const st = await participantStats(db, TODAY, {});
    expect(st.month).toBe('2026-11');
    expect(st.totals).toEqual({ active: 3, new_this_year: 1, classes: 2 });
    // A: 2 students x 1 Saturday = 2 meetings, 1 attended. B: 1 student x 2 Mondays, 1 attended.
    expect(st.attendance).toEqual({ meetings: 4, attended: 2, rate: 50 });
    expect(st.payments).toEqual({ holiday: false, paid: 1, unpaid: 2 });
    expect(st.by_class).toEqual([
      { id: a.classId, name: 'A', students: 2, attendance_rate: 50, paid: 1 },
      { id: b.classId, name: 'B', students: 1, attendance_rate: 50, paid: 0 },
    ]);
    expect(st.gender).toEqual({ MALE: 1, FEMALE: 1, UNKNOWN: 1 });
    expect(st.positions).toEqual({ ANCHOR: 2, FLANK: 0, PIVOT: 0, KIPER: 1 });
    expect(st.age_groups.find((g) => g.label === '9–10')?.count).toBe(1);
    expect(st.age_groups.find((g) => g.label === '13–14')?.count).toBe(1);
    expect(st.age_groups.find((g) => g.label === 'Belum diisi')?.count).toBe(1);
    expect(st.year_join).toEqual([
      { year: 2024, count: 2 },
      { year: 2026, count: 1 },
    ]);
    expect(st.unpaid_students.map((s) => s.name)).toEqual(['Dimas', 'Rizky']);
  });

  it('narrows everything to one class', async () => {
    const st = await participantStats(db, TODAY, { class_id: String(b.classId) });
    expect(st.totals.active).toBe(1);
    expect(st.by_class.map((c) => c.name)).toEqual(['B']);
    expect(st.unpaid_students.map((s) => s.name)).toEqual(['Dimas']);
  });

  it('reports a holiday month instead of unpaid fees', async () => {
    await db.insert(holidayPeriods).values({ period: '2026-11-01' });
    const st = await participantStats(db, TODAY, {});
    expect(st.payments).toEqual({ holiday: true, paid: 0, unpaid: 0 });
    expect(st.unpaid_students).toEqual([]);
    expect(st.attendance).toEqual({ meetings: 0, attended: 0, rate: null });
  });
});
