import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { attendances, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { getAttendanceMatrix, saveAttendance } from '@/server/services/attendance';
import { updateClass } from '@/server/services/classes';
import { fail } from '@/server/http';

let db: Db;
let coachId: number;
let classId: number;
let sunId: number;
let wedId: number;
let budi: number;

const range = { start: '2026-11-09', end: '2026-11-15' }; // Mon..Sun

beforeEach(async () => {
  db = await createTestDb();
  ({ coachId } = await makeCoach(db));
  const c = await makeClass(db, {
    coachId,
    schedules: [
      { day_of_week: 0, start_time: '08:00', end_time: '10:00' },
      { day_of_week: 3, start_time: '16:00', end_time: '18:00' },
    ],
  });
  classId = c.classId;
  [sunId, wedId] = c.scheduleIds;
  ({ studentId: budi } = await makeStudent(db, { classId, name: 'Budi' }));
});

const matrix = () => getAttendanceMatrix(db, { class_id: String(classId), ...range });

describe('attendance', () => {
  it('builds dates from schedules including Sunday', async () => {
    const m = await matrix();
    expect(m.dates.map((d) => [d.date, d.class_schedule_id])).toEqual([
      ['2026-11-11', wedId],
      ['2026-11-15', sunId],
    ]);
    expect(m.students).toEqual([{ student_id: budi, name: 'Budi', attendance: { '2026-11-11': false, '2026-11-15': false } }]);
  });

  it('saves Sunday attendance', async () => {
    await saveAttendance(db, { list: [{ student_id: budi, class_schedule_id: sunId, date: '2026-11-15', is_present: true }] });
    expect((await matrix()).students[0].attendance['2026-11-15']).toBe(true);
  });

  it('saving present twice is idempotent and false removes the row', async () => {
    const item = { student_id: budi, class_schedule_id: wedId, date: '2026-11-11', is_present: true };
    await saveAttendance(db, { list: [item] });
    await saveAttendance(db, { list: [item] });
    expect(await db.select().from(attendances)).toHaveLength(1);
    await saveAttendance(db, { list: [{ ...item, is_present: false }] });
    expect(await db.select().from(attendances)).toHaveLength(0);
  });

  it('rejects a mismatched weekday without writing anything', async () => {
    const err = await saveAttendance(db, {
      list: [
        { student_id: budi, class_schedule_id: wedId, date: '2026-11-11', is_present: true },
        { student_id: budi, class_schedule_id: sunId, date: '2026-11-16', is_present: true },
      ],
    }).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors).toHaveProperty('list.1');
    expect(await db.select().from(attendances)).toHaveLength(0);
  });

  it('rejects a student from another class', async () => {
    const other = await makeClass(db, { coachId });
    const { studentId } = await makeStudent(db, { classId: other.classId });
    const err = await saveAttendance(db, { list: [{ student_id: studentId, class_schedule_id: wedId, date: '2026-11-11', is_present: true }] }).catch((e) => e);
    expect(fail(err).status).toBe(422);
  });

  it('excludes inactive students and deleted schedules', async () => {
    const { userId } = await makeStudent(db, { classId, name: 'Andi' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    await updateClass(db, classId, { name: 'A', coach_id: coachId, schedules: [{ id: wedId, day_of_week: 3, start_time: '16:00', end_time: '18:00' }] });
    const m = await matrix();
    expect(m.students.map((s) => s.name)).toEqual(['Budi']);
    expect(m.dates.map((d) => d.date)).toEqual(['2026-11-11']);
  });

  it('rejects end before start and bad dates', async () => {
    const e1 = await getAttendanceMatrix(db, { class_id: String(classId), start: '2026-11-15', end: '2026-11-09' }).catch((e) => e);
    expect(fail(e1).status).toBe(422);
    const e2 = await getAttendanceMatrix(db, { class_id: String(classId), start: '2026-02-30', end: '2026-03-02' }).catch((e) => e);
    expect(fail(e2).status).toBe(422);
    const e3 = await getAttendanceMatrix(db, { class_id: String(classId) }).catch((e) => e);
    expect(fail(e3).status).toBe(422);
  });

  it('rejects ranges over 93 days', async () => {
    const err = await getAttendanceMatrix(db, { class_id: String(classId), start: '2026-01-01', end: '2026-04-05' }).catch((e) => e);
    expect(fail(err).status).toBe(422);
  });

  it('rejects an empty list', async () => {
    expect(fail(await saveAttendance(db, { list: [] }).catch((e) => e)).status).toBe(422);
  });
});
