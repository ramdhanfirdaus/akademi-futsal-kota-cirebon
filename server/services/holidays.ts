import 'server-only';
import { and, between, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { holidayPeriods } from '../db/schema';
import type { Db } from '../db';
import { notFound } from '../errors';
import { isValidDate, monthKey, monthStart } from '@/lib/date';
import type { Tx } from './users';

const monthInput = z
  .string()
  .refine((s) => /^\d{4}-\d{2}(-\d{2})?$/.test(s) && isValidDate(s.length === 7 ? `${s}-01` : s), 'Format bulan YYYY-MM')
  .transform(monthStart);

export const periodSchema = monthInput;

const createSchema = z.object({ period: monthInput });

export async function listHolidays(db: Db): Promise<{ id: number; period: string }[]> {
  return db.select({ id: holidayPeriods.id, period: holidayPeriods.period }).from(holidayPeriods).orderBy(desc(holidayPeriods.period));
}

/** Idempotent: posting an existing month returns the existing row. */
export async function createHoliday(db: Db, input: unknown): Promise<{ id: number; period: string }> {
  const { period } = createSchema.parse(input);
  await db.insert(holidayPeriods).values({ period }).onConflictDoNothing();
  const [row] = await db
    .select({ id: holidayPeriods.id, period: holidayPeriods.period })
    .from(holidayPeriods)
    .where(eq(holidayPeriods.period, period));
  return row;
}

export async function deleteHoliday(db: Db, holidayId: number): Promise<void> {
  const deleted = await db.delete(holidayPeriods).where(eq(holidayPeriods.id, holidayId)).returning({ id: holidayPeriods.id });
  if (!deleted.length) throw notFound();
}

/** `YYYY-MM` keys of holiday months, optionally limited to a date range. */
export async function holidayMonthKeys(db: Tx, start?: string, end?: string): Promise<string[]> {
  const rows = await db
    .select({ period: holidayPeriods.period })
    .from(holidayPeriods)
    .where(start && end ? and(between(holidayPeriods.period, monthStart(start), end)) : undefined);
  return rows.map((r) => monthKey(r.period)).sort();
}
