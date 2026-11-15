import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeAdmin, makeClass, makeCoach, makeStudent, makeUser } from './helpers/fixtures';
import { attendances, classSchedules, coaches, students } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { hashPassword, loadActor, readSessionToken, signSession, SESSION_COOKIE } from '@/server/auth';
import { changePassword } from '@/server/services/auth';
import { createStudent } from '@/server/services/students';
import { createCoach } from '@/server/services/coaches';
import { updateAdmin } from '@/server/services/admins';
import { updateClass } from '@/server/services/classes';
import { getAttendanceMatrix, saveAttendance } from '@/server/services/attendance';
import { savePayments } from '@/server/services/payments';
import { withUsernameRetry } from '@/server/services/users';
import { fail, pgCode } from '@/server/http';

const SECRET = 'test-secret-test-secret-test-secret';
beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

let db: Db;
let coachId: number;
let classId: number;
beforeEach(async () => {
  db = await createTestDb();
  ({ coachId } = await makeCoach(db));
  ({ classId } = await makeClass(db, { coachId }));
});

const statusOf = async (p: Promise<unknown>) => fail(await p.then(() => null, (e) => e)).status;
const studentInput = (over: Record<string, unknown> = {}) => ({
  password: 'afkc2026',
  name: 'Budi',
  nickname: 'Budi',
  class_id: classId,
  position: 'ANCHOR',
  year_join: '2025',
  ...over,
});

describe('input length limits', () => {
  it('rejects over-long student fields with 422 instead of a database error', async () => {
    expect(await statusOf(createStudent(db, studentInput({ name: 'x'.repeat(256) })))).toBe(422);
    expect(await statusOf(createStudent(db, studentInput({ parent_phone: '1'.repeat(65) })))).toBe(422);
    expect(await statusOf(createStudent(db, studentInput({ address: 'x'.repeat(2001) })))).toBe(422);
    expect(await statusOf(createStudent(db, studentInput({ password: 'x'.repeat(73) })))).toBe(422);
  });

  it('rejects over-long coach names with 422', async () => {
    expect(await statusOf(createCoach(db, { password: 'pw', name: 'x'.repeat(256) }))).toBe(422);
  });
});

describe('savePayments', () => {
  it('rejects unknown or foreign student ids with 422', async () => {
    const other = (await makeClass(db, { coachId })).classId;
    const { studentId: stranger } = await makeStudent(db, { classId: other });
    const save = (studentId: number) =>
      savePayments(db, { class_id: classId, year: 2026, data: [{ student_id: studentId, months: [{ period: '2026-03', is_paid: true }] }] });
    expect(await statusOf(save(99999))).toBe(422);
    expect(await statusOf(save(stranger))).toBe(422);
  });
});

describe('session cookie', () => {
  it('ignores a malformed cookie instead of throwing', () => {
    const req = new Request('http://localhost/', { headers: { cookie: `${SESSION_COOKIE}=%E0%A4%A` } });
    expect(readSessionToken(req)).toBeUndefined();
  });
});

describe('schedules', () => {
  const mon = { day_of_week: 1, start_time: '16:00', end_time: '18:00' };

  it('rejects the same schedule id twice', async () => {
    const { classId: c, scheduleIds: [s] } = await makeClass(db, { coachId, schedules: [mon] });
    const res = updateClass(db, c, {
      name: 'A',
      coach_id: coachId,
      schedules: [{ ...mon, id: s }, { ...mon, id: s, day_of_week: 2 }],
    });
    expect(await statusOf(res)).toBe(422);
  });

  it('keeps attendance history visible after a weekday change or removal', async () => {
    const { classId: c, scheduleIds: [s] } = await makeClass(db, { coachId, schedules: [mon] });
    const { studentId } = await makeStudent(db, { classId: c });
    // 2026-01-05 is a Monday, 2026-01-06 a Tuesday.
    await saveAttendance(db, { list: [{ student_id: studentId, class_schedule_id: s, date: '2026-01-05', is_present: true }] });

    const updated = await updateClass(db, c, { name: 'A', coach_id: coachId, schedules: [{ ...mon, id: s, day_of_week: 2 }] });
    const tue = updated.schedules[0];
    expect(tue.day_of_week).toBe(2);
    expect(tue.id).not.toBe(s); // the Monday row is retired, not rewritten
    const [old] = await db.select().from(classSchedules).where(eq(classSchedules.id, s));
    expect(old.dayOfWeek).toBe(1);
    expect(old.deletedAt).not.toBeNull();

    const past = await getAttendanceMatrix(db, { class_id: String(c), start: '2026-01-05', end: '2026-01-06' });
    expect(past.dates.map((d) => [d.date, d.class_schedule_id])).toEqual([
      ['2026-01-05', s],
      ['2026-01-06', tue.id],
    ]);
    expect(past.students[0].attendance['2026-01-05']).toBe(true);

    // Past sessions of the retired schedule can still be corrected …
    await saveAttendance(db, { list: [{ student_id: studentId, class_schedule_id: s, date: '2026-01-05', is_present: false }] });
    expect(await db.select().from(attendances)).toHaveLength(0);
    // … but it takes no new sessions after it was retired.
    const future = saveAttendance(db, { list: [{ student_id: studentId, class_schedule_id: s, date: '2099-01-05', is_present: true }] });
    expect(await statusOf(future)).toBe(422);
    const later = await getAttendanceMatrix(db, { class_id: String(c), start: '2099-01-05', end: '2099-01-06' });
    expect(later.dates.map((d) => d.class_schedule_id)).toEqual([tue.id]);
  });
});

describe('username conflicts', () => {
  it('retries generated usernames that lost a race', async () => {
    let calls = 0;
    const result = await withUsernameRetry(async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error('dup'), { code: '23505', constraint: 'users_username_unique' });
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(2);
  });

  it('does not retry other errors', async () => {
    let calls = 0;
    const err = await withUsernameRetry(async () => {
      calls++;
      throw Object.assign(new Error('dup'), { code: '23505', constraint: 'payments_student_period' });
    }).catch((e) => e);
    expect(pgCode(err)).toBe('23505');
    expect(calls).toBe(1);
  });

  it('explains a taken username', async () => {
    await makeUser(db, 'ADMIN', { username: 'dipakai' });
    const { userId } = await makeAdmin(db);
    const res = fail(await updateAdmin(db, userId, { username: 'dipakai' }).catch((e) => e));
    expect(res.status).toBe(409);
    expect((await res.json()).message).toBe('Username sudah dipakai');
  });
});

describe('session revocation', () => {
  it('a password change signs out other sessions but returns a fresh one', async () => {
    const { userId } = await makeCoach(db, { username: 'c9', password: await hashPassword('lama123') });
    const actor = { userId, role: 'COACH' as const, username: 'c9' };
    const before = await signSession({ userId, role: 'COACH' });
    const { sessionVersion } = await changePassword(db, actor, { old_password: 'lama123', new_password: 'baru123' });
    expect(await loadActor(db, before)).toBeNull();
    expect(await loadActor(db, await signSession({ userId, role: 'COACH', sessionVersion }))).toMatchObject({ userId });
  });

  it('a staff password reset signs the user out', async () => {
    const { userId } = await makeAdmin(db);
    const token = await signSession({ userId, role: 'ADMIN' });
    await updateAdmin(db, userId, { username: 'admin77', password: 'baru' });
    expect(await loadActor(db, token)).toBeNull();
  });
});

describe('one profile per account', () => {
  it('refuses a second student or coach row for the same user', async () => {
    const u = await makeUser(db, 'STUDENT');
    await db.insert(students).values({ userId: u.id, name: 'A' });
    expect(pgCode(await db.insert(students).values({ userId: u.id, name: 'B' }).catch((e) => e))).toBe('23505');
    const c = await makeUser(db, 'COACH');
    await db.insert(coaches).values({ userId: c.id, name: 'A' });
    expect(pgCode(await db.insert(coaches).values({ userId: c.id, name: 'B' }).catch((e) => e))).toBe('23505');
  });
});

describe('JWT secret', () => {
  it('refuses a short secret', async () => {
    process.env.JWT_SECRET = 'short';
    try {
      await expect(signSession({ userId: 1, role: 'ADMIN' })).rejects.toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = SECRET;
    }
  });
});
