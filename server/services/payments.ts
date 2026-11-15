import 'server-only';
import { and, between, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { academyStudents, payments } from '../db/schema';
import type { Db } from '../db';
import { monthKey, monthKeysBetween, resolveRange } from '@/lib/date';
import { invalid } from '../errors';
import { chunks, id } from '../validation';
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

/** not_due: the month is before the student's fee start, so nothing is owed (unless paid anyway). */
export type PaymentMonth = { period: string; is_paid: boolean; is_holiday: boolean; not_due: boolean };

export async function getPaymentMatrix(db: Db, q: Record<string, string | undefined>) {
  const { class_id: classId, year, month } = matrixQuery.parse(q);
  const { start, end } = resolveRange(year, month);
  const keys = monthKeysBetween(start, end);
  const holidays = new Set(await holidayMonthKeys(db, start, end));
  const roster = await activeStudentsInClass(db, classId);

  const paid = new Set<string>();
  const feeMonth = new Map<number, string>();
  if (roster.length) {
    const starts = await db
      .select({ studentId: academyStudents.studentId, feeStart: academyStudents.feeStart })
      .from(academyStudents)
      .where(inArray(academyStudents.studentId, roster.map((s) => s.id)));
    for (const r of starts) feeMonth.set(r.studentId, monthKey(r.feeStart));
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
        ? { period: key, is_paid: false, is_holiday: true, not_due: false }
        : { period: key, is_paid: paid.has(`${s.id}|${key}`), is_holiday: false, not_due: key < (feeMonth.get(s.id) ?? '') },
    ),
  }));
}

/** Holiday months are skipped; true inserts (idempotent), false deletes. */
export async function savePayments(db: Db, input: unknown): Promise<void> {
  const d = saveSchema.parse(input);
  const roster = new Set((await activeStudentsInClass(db, d.class_id)).map((s) => s.id));
  const errors: Record<string, string[]> = {};
  d.data.forEach((s, i) => {
    if (!roster.has(s.student_id)) errors[`data.${i}.student_id`] = ['Siswa tidak terdaftar di kelas ini'];
  });
  if (Object.keys(errors).length) throw invalid(errors);

  const holidays = new Set(await holidayMonthKeys(db));
  const cells = d.data.flatMap((s) =>
    s.months.filter((m) => !holidays.has(monthKey(m.period))).map((m) => ({ studentId: s.student_id, period: m.period, paid: m.is_paid })),
  );
  const paid = cells.filter((c) => c.paid).map(({ studentId, period }) => ({ studentId, period }));
  const unpaid = cells.filter((c) => !c.paid);

  // One INSERT and one DELETE per chunk, not one query per cell (the DB may be far from the function).
  await db.transaction(async (tx) => {
    for (const part of chunks(paid)) await tx.insert(payments).values(part).onConflictDoNothing();
    for (const part of chunks(unpaid)) {
      await tx
        .delete(payments)
        .where(sql`(${payments.studentId}, ${payments.period}) in (${sql.join(part.map((c) => sql`(${c.studentId}::int, ${c.period}::date)`), sql`, `)})`);
    }
  });
}
