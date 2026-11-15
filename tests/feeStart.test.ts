import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeAdmin, makeClass, makeCoach } from './helpers/fixtures';
import { academyStudents, students } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { createStudent, updateStudent } from '@/server/services/students';
import { studentDashboard } from '@/server/services/dashboard';
import { getPaymentMatrix } from '@/server/services/payments';
import { participantStats } from '@/server/services/participants';
import { fail } from '@/server/http';
import { monthKey, todayWIB } from '@/lib/date';

let db: Db;
let admin: Actor;
let classId: number;

beforeEach(async () => {
  db = await createTestDb();
  const a = await makeAdmin(db);
  admin = { userId: a.userId, role: 'ADMIN', username: 'admin' };
  ({ classId } = await makeClass(db, { coachId: (await makeCoach(db)).coachId, name: 'A' }));
});

const input = (over: Record<string, unknown> = {}) => ({
  password: 'afkc2026',
  name: 'Budi',
  nickname: 'Budi',
  class_id: classId,
  position: 'ANCHOR',
  year_join: '2026',
  ...over,
});
const statusOf = async (p: Promise<unknown>) => fail(await p.then(() => null, (e) => e)).status;

async function enrolled(feeStart: string, createdAt = '2026-01-10 03:00:00') {
  const s = await createStudent(db, input({ fee_start: feeStart }));
  await db.update(students).set({ createdAt }).where(eq(students.id, s.id));
  return { s, actor: { userId: s.user_id, role: 'STUDENT' as const, username: s.username } };
}

describe('fee start month', () => {
  it('defaults to the current month and can be set when adding a student', async () => {
    expect((await createStudent(db, input())).fee_start).toBe(monthKey(todayWIB()));
    expect((await createStudent(db, input({ name: 'Rizky', nickname: 'Rizky', fee_start: '2026-03' }))).fee_start).toBe('2026-03');
    expect(await statusOf(createStudent(db, input({ fee_start: 'maret' })))).toBe(422);
  });

  it('can be changed by staff but not by the student', async () => {
    const s = await createStudent(db, input({ fee_start: '2026-03' }));
    expect((await updateStudent(db, admin, s.id, input({ fee_start: '2026-05' }))).fee_start).toBe('2026-05');
    const self = { userId: s.user_id, role: 'STUDENT' as const, username: s.username };
    await updateStudent(db, self, s.id, { fee_start: '2025-01', address: 'Jl. Kenari' });
    const [row] = await db.select({ f: academyStudents.feeStart }).from(academyStudents).where(eq(academyStudents.studentId, s.id));
    expect(row.f).toBe('2026-05-01');
  });

  it('student dashboard: months before the fee start are not owed', async () => {
    const { actor } = await enrolled('2026-03');
    const d = await studentDashboard(db, actor, '2026-04-15');
    expect(d.months.slice(0, 4).map((m) => m.payment)).toEqual(['NOT_DUE', 'NOT_DUE', 'UNPAID', 'UNPAID']);
    expect(d.unpaid_months).toEqual(['2026-03', '2026-04']);
  });

  it('student dashboard: a fee start before registration is owed from then', async () => {
    const { actor } = await enrolled('2025-12', '2026-02-10 03:00:00');
    const d = await studentDashboard(db, actor, '2026-02-20');
    expect(d.unpaid_months).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('student dashboard: this month is not due when fees start later', async () => {
    const { actor } = await enrolled('2026-05');
    const d = await studentDashboard(db, actor, '2026-04-15');
    expect(d.payment_status).toBe('NOT_DUE');
    expect(d.unpaid_months).toEqual([]);
  });

  it('payment matrix marks months before the fee start', async () => {
    await enrolled('2026-03');
    const [row] = await getPaymentMatrix(db, { class_id: String(classId), year: '2026' });
    expect(row.months.slice(0, 4).map((m) => m.not_due)).toEqual([true, true, false, false]);
  });

  it('participant stats do not count students whose fees start later', async () => {
    await enrolled('2026-03');
    await createStudent(db, input({ name: 'Rizky', nickname: 'Rizky', fee_start: '2026-05' }));
    const st = await participantStats(db, '2026-04-15', {});
    expect(st.payments).toEqual({ holiday: false, paid: 0, unpaid: 1, not_due: 1 });
    expect(st.unpaid_students.map((s) => s.name)).toEqual(['Budi']);
  });
});
