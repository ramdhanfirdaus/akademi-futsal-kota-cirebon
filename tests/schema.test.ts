import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { academyStudents, assessmentSemesters, assessments, attendances, classSchedules, users } from '@/server/db/schema';
import { pgCode } from '@/server/http';
import type { Db } from '@/server/db';
import { eq } from 'drizzle-orm';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('schema constraints', () => {
  it('rejects a second academy row for the same student', async () => {
    const { coachId } = await makeCoach(db);
    const { classId } = await makeClass(db, { coachId });
    const { studentId } = await makeStudent(db, { classId });
    await expect(db.insert(academyStudents).values({ studentId, classId, position: 'FLANK', yearJoin: 2025 })).rejects.toThrow();
  });

  it('blocks hard-deleting a schedule that has attendance', async () => {
    const { coachId } = await makeCoach(db);
    const { classId, scheduleIds } = await makeClass(db, {
      coachId,
      schedules: [{ day_of_week: 6, start_time: '08:00', end_time: '10:00' }],
    });
    const { studentId } = await makeStudent(db, { classId });
    await db.insert(attendances).values({ studentId, classScheduleId: scheduleIds[0], date: '2026-11-14' });
    await expect(db.delete(classSchedules).where(eq(classSchedules.id, scheduleIds[0]))).rejects.toThrow();
  });

  it('requires users.role', async () => {
    await expect(
      // @ts-expect-error role intentionally missing
      db.insert(users).values({ username: 'norole', password: 'x' }),
    ).rejects.toThrow();
  });

  it('allows one assessment per semester, student and track', async () => {
    const { coachId } = await makeCoach(db);
    const { classId } = await makeClass(db, { coachId });
    const { studentId } = await makeStudent(db, { classId });
    const [sem] = await db.insert(assessmentSemesters).values({ name: 'S1', numberFormat: '{urut}' }).returning();
    const row = { semesterId: sem.id, studentId, track: 'PLAYER' as const, classId };
    await db.insert(assessments).values(row);
    await db.insert(assessments).values({ ...row, track: 'GOALKEEPER' });
    const err = await db
      .insert(assessments)
      .values(row)
      .catch((e) => e);
    expect(pgCode(err)).toBe('23505');
  });
});
