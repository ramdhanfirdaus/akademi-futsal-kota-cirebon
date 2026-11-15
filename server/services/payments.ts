import 'server-only';
import { and, between, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { payments } from '../db/schema';
import type { Db } from '../db';
import { monthKey, monthKeysBetween, resolveRange } from '@/lib/date';
import { id } from '../validation';
import { holidayMonthKeys, periodSchema } from './holidays';
import { activeStudentsInClass } from './students';

const matrixQuery = z.object({
  class_id: id,
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.preprocess((v) => (v === '' || v === undefined ? undefined : v), z.coerce.number().int().min(1).max(12).optional()),
});

const saveSchema = z.object({
  class_id: id,
  year: z.coerce.number().int(),
  data: z.array(
    z.object({
      student_id: id,
      months: z.array(z.object({ period: periodSchema, is_paid: z.boolean() })),
    }),
  ),
});

export type PaymentMonth = { period: string; is_paid: boolean; is_holiday: boolean };

export async function getPaymentMatrix(db: Db, q: Record<string, string | undefined>) {
  const { class_id: classId, year, month } = matrixQuery.parse(q);
  const { start, end } = resolveRange(year, month);
  const keys = monthKeysBetween(start, end);
  const holidays = new Set(await holidayMonthKeys(db, start, end));
  const roster = await activeStudentsInClass(db, classId);

  const paid = new Set<string>();
  if (roster.length) {
    const rows = await db
      .select({ studentId: payments.studentId, period: payments.period })
      .from(payments)
      .where(and(inArray(payments.studentId, roster.map((s) => s.id)), between(payments.period, start, end)));
    for (const r of rows) paid.add(`${r.studentId}|${monthKey(r.period)}`);
  }

  return roster.map((s) => ({
    student_id: s.id,
    name: s.name,
    months: keys.map<PaymentMonth>((key) =>
      holidays.has(key)
        ? { period: key, is_paid: false, is_holiday: true }
        : { period: key, is_paid: paid.has(`${s.id}|${key}`), is_holiday: false },
    ),
  }));
}

/** Holiday months are skipped; true inserts (idempotent), false deletes. */
export async function savePayments(db: Db, input: unknown): Promise<void> {
  const d = saveSchema.parse(input);
  const holidays = new Set(await holidayMonthKeys(db));
  await db.transaction(async (tx) => {
    for (const student of d.data) {
      for (const m of student.months) {
        if (holidays.has(monthKey(m.period))) continue;
        if (m.is_paid) {
          await tx.insert(payments).values({ studentId: student.student_id, period: m.period }).onConflictDoNothing();
        } else {
          await tx.delete(payments).where(and(eq(payments.studentId, student.student_id), eq(payments.period, m.period)));
        }
      }
    }
  });
}
