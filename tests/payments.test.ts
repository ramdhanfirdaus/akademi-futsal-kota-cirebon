import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach, makeStudent } from './helpers/fixtures';
import { payments, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { createHoliday, deleteHoliday, holidayMonthKeys, listHolidays } from '@/server/services/holidays';
import { getPaymentMatrix, savePayments } from '@/server/services/payments';
import { fail } from '@/server/http';

let db: Db;
let classId: number;
let budi: number;

beforeEach(async () => {
  db = await createTestDb();
  const { coachId } = await makeCoach(db);
  ({ classId } = await makeClass(db, { coachId }));
  ({ studentId: budi } = await makeStudent(db, { classId, name: 'Budi' }));
});

const save = (months: { period: string; is_paid: boolean }[]) =>
  savePayments(db, { class_id: classId, year: 2026, data: [{ student_id: budi, months }] });

const month = async (key: string, q: Record<string, string> = {}) => {
  const [row] = await getPaymentMatrix(db, { class_id: String(classId), year: '2026', ...q });
  return row.months.find((m) => m.period === key);
};

describe('holidays', () => {
  it('normalises formats and is idempotent', async () => {
    const a = await createHoliday(db, { period: '2026-07' });
    const b = await createHoliday(db, { period: '2026-07-19' });
    expect(b.id).toBe(a.id);
    expect(await listHolidays(db)).toEqual([{ id: a.id, period: '2026-07-01' }]);
  });

  it('lists holidays newest first, not classes', async () => {
    await createHoliday(db, { period: '2026-01' });
    await createHoliday(db, { period: '2026-07' });
    expect((await listHolidays(db)).map((h) => h.period)).toEqual(['2026-07-01', '2026-01-01']);
    expect(await holidayMonthKeys(db, '2026-01-01', '2026-06-30')).toEqual(['2026-01']);
  });

  it('rejects bad periods and deletes', async () => {
    expect(fail(await createHoliday(db, { period: '2026-13' }).catch((e) => e)).status).toBe(422);
    const h = await createHoliday(db, { period: '2026-03' });
    await deleteHoliday(db, h.id);
    expect(await listHolidays(db)).toEqual([]);
  });
});

describe('payments', () => {
  it('matrix has 12 months for a year and 1 with a month param', async () => {
    const [row] = await getPaymentMatrix(db, { class_id: String(classId), year: '2026' });
    expect(row.months).toHaveLength(12);
    expect(row.months[0]).toEqual({ period: '2026-01', is_paid: false, is_holiday: false, not_due: false });
    const [one] = await getPaymentMatrix(db, { class_id: String(classId), year: '2026', month: '3' });
    expect(one.months.map((m) => m.period)).toEqual(['2026-03']);
  });

  it('paid month round-trips', async () => {
    await save([{ period: '2026-03', is_paid: true }]);
    expect(await month('2026-03')).toMatchObject({ is_paid: true });
    await save([{ period: '2026-03', is_paid: false }]);
    expect(await month('2026-03')).toMatchObject({ is_paid: false });
  });

  it('holiday month is flagged and not stored', async () => {
    await createHoliday(db, { period: '2026-07' });
    expect(await month('2026-07')).toEqual({ period: '2026-07', is_paid: false, is_holiday: true, not_due: false });
    await save([{ period: '2026-07', is_paid: true }]);
    expect(await db.select().from(payments)).toHaveLength(0);
  });

  it('inactive students are excluded', async () => {
    const { userId } = await makeStudent(db, { classId, name: 'Andi' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    const rows = await getPaymentMatrix(db, { class_id: String(classId), year: '2026' });
    expect(rows.map((r) => r.name)).toEqual(['Budi']);
  });

  it('validates input', async () => {
    expect(fail(await getPaymentMatrix(db, { year: '2026' }).catch((e) => e)).status).toBe(422);
    expect(fail(await savePayments(db, { class_id: classId, year: 2026, data: [{ student_id: budi, months: [{ period: 'abc', is_paid: true }] }] }).catch((e) => e)).status).toBe(422);
  });
});
