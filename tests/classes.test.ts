import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeCoach, makeStudent } from './helpers/fixtures';
import { attendances, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { createClass, deleteClass, listClasses, updateClass } from '@/server/services/classes';
import { fail } from '@/server/http';

let db: Db;
let coachId: number;

const monday = { day_of_week: 1, start_time: '16:00', end_time: '18:00' };
const saturday = { day_of_week: 6, start_time: '08:00', end_time: '10:00' };

beforeEach(async () => {
  db = await createTestDb();
  ({ coachId } = await makeCoach(db, { name: 'Fathur' }));
});

describe('classes', () => {
  it('creates a class and lists it with coach and schedules', async () => {
    await createClass(db, { name: 'A', coach_id: coachId, schedules: [saturday, monday] });
    const [c] = await listClasses(db);
    expect(c).toMatchObject({ name: 'A', coach_id: coachId, coach: { id: coachId, name: 'Fathur' } });
    expect(c.schedules.map((s) => [s.day_of_week, s.start_time])).toEqual([
      [1, '16:00:00'],
      [6, '08:00:00'],
    ]);
  });

  it('editing a class keeps attendance history', async () => {
    const c = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday] });
    const scheduleId = c.schedules[0].id;
    const { studentId } = await makeStudent(db, { classId: c.id });
    await db.insert(attendances).values({ studentId, classScheduleId: scheduleId, date: '2026-11-16' });

    const updated = await updateClass(db, c.id, { name: 'A1', coach_id: coachId, schedules: [{ ...monday, id: scheduleId }] });

    expect(updated.name).toBe('A1');
    expect(updated.schedules.map((s) => s.id)).toEqual([scheduleId]);
    expect(await db.select().from(attendances)).toHaveLength(1);
  });

  it('removing a schedule soft-deletes it', async () => {
    const c = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday, saturday] });
    const [mon, sat] = c.schedules;
    const { studentId } = await makeStudent(db, { classId: c.id });
    await db.insert(attendances).values({ studentId, classScheduleId: sat.id, date: '2026-11-14' });

    await updateClass(db, c.id, { name: 'A', coach_id: coachId, schedules: [{ ...monday, id: mon.id }, { day_of_week: 3, start_time: '15:00', end_time: '17:00' }] });

    const [listed] = await listClasses(db);
    expect(listed.schedules.map((s) => s.day_of_week)).toEqual([1, 3]);
    expect(await db.select().from(attendances)).toHaveLength(1);
  });

  it('rejects two schedules on the same day', async () => {
    const err = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday, { ...monday, start_time: '19:00', end_time: '20:00' }] }).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors).toHaveProperty('schedules');
  });

  it('rejects end time before start time', async () => {
    const err = await createClass(db, { name: 'A', coach_id: coachId, schedules: [{ day_of_week: 2, start_time: '10:00', end_time: '09:00' }] }).catch((e) => e);
    expect(fail(err).status).toBe(422);
  });

  it('rejects a schedule id from another class', async () => {
    const a = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday] });
    const b = await createClass(db, { name: 'B', coach_id: coachId, schedules: [] });
    const err = await updateClass(db, b.id, { name: 'B', coach_id: coachId, schedules: [{ ...monday, id: a.schedules[0].id }] }).catch((e) => e);
    expect(fail(err).status).toBe(422);
  });

  it('accepts the FE echo payload with extra keys', async () => {
    const c = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday] });
    const echo = {
      ...c,
      name: 'A2',
      coach: { id: coachId, name: 'Fathur', user: {} },
      created_at: '2026-01-01T00:00:00Z',
      schedules: c.schedules.map((s) => ({ ...s, class_id: c.id, created_at: 'x', updated_at: null })),
    };
    await expect(updateClass(db, c.id, echo)).resolves.toMatchObject({ name: 'A2' });
  });

  it('delete refuses while the class has active students', async () => {
    const c = await createClass(db, { name: 'A', coach_id: coachId, schedules: [monday] });
    const { userId } = await makeStudent(db, { classId: c.id });
    expect(fail(await deleteClass(db, c.id).catch((e) => e)).status).toBe(409);

    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    await deleteClass(db, c.id);
    expect(await listClasses(db)).toEqual([]);
  });

  it('rejects an unknown coach', async () => {
    const err = await createClass(db, { name: 'A', coach_id: 999, schedules: [] }).catch((e) => e);
    expect(fail(err).status).toBe(422);
    expect(err.errors).toHaveProperty('coach_id');
  });
});
