import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { attendances, payments } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { savePayments } from '@/server/services/payments';
import { saveAttendance } from '@/server/services/attendance';
import { eachDate, dayOfWeek } from '@/lib/date';

// Serverless functions may sit far from the database: saves must not issue one query per matrix cell.
let db: Db;
let queries = 0;
let counting = false;
let classId: number;
let scheduleId: number;
let studentIds: number[];

beforeEach(async () => {
  db = await createTestDb({ onQuery: () => { if (counting) queries++; } });
  const { coachId } = await makeCoach(db);
  const c = await makeClass(db, { coachId, schedules: [{ day_of_week: 6, start_time: '08:00', end_time: '10:00' }] });
  classId = c.classId;
  scheduleId = c.scheduleIds[0];
  studentIds = [];
  for (let i = 0; i < 30; i++) studentIds.push((await makeStudent(db, { classId, name: `S${i}` })).studentId);
  queries = 0;
});

async function counted(fn: () => Promise<void>) {
  counting = true;
  try { await fn(); } finally { counting = false; }
  return queries;
}

describe('batched saves', () => {
  it('saves a full payment matrix in a constant number of queries', async () => {
    const data = studentIds.map((id, i) => ({
      student_id: id,
      months: Array.from({ length: 12 }, (_, m) => ({ period: `2026-${String(m + 1).padStart(2, '0')}`, is_paid: (i + m) % 2 === 0 })),
    }));
    const n = await counted(() => savePayments(db, { class_id: classId, year: 2026, data }));
    expect(n).toBeLessThanOrEqual(8);
    expect(await db.select().from(payments)).toHaveLength(180);

    // flip everything: paid rows removed, unpaid rows added
    const flipped = data.map((s) => ({ ...s, months: s.months.map((m) => ({ ...m, is_paid: !m.is_paid })) }));
    await savePayments(db, { class_id: classId, year: 2026, data: flipped });
    const rows = await db.select().from(payments);
    expect(rows).toHaveLength(180);
    expect(rows.some((r) => r.studentId === studentIds[0] && r.period === '2026-01-01')).toBe(false);
    expect(rows.some((r) => r.studentId === studentIds[0] && r.period === '2026-02-01')).toBe(true);
  });

  it('saves a full attendance matrix in a constant number of queries', async () => {
    const saturdays = eachDate('2026-09-01', '2026-11-30').filter((d) => dayOfWeek(d) === 6);
    const list = studentIds.flatMap((id, i) =>
      saturdays.map((date, j) => ({ student_id: id, class_schedule_id: scheduleId, date, is_present: (i + j) % 3 === 0 })),
    );
    const n = await counted(() => saveAttendance(db, { list }));
    expect(n).toBeLessThanOrEqual(10);
    const expected = list.filter((x) => x.is_present).length;
    expect(await db.select().from(attendances)).toHaveLength(expected);

    await saveAttendance(db, { list: list.map((x) => ({ ...x, is_present: false })) });
    expect(await db.select().from(attendances)).toHaveLength(0);
  });
});
