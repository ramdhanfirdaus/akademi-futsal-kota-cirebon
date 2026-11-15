import 'server-only';
import { z } from 'zod';
import { isValidDate } from '@/lib/date';

/** Treats '' / null / undefined from HTML forms as "no value". */
const blank = (v: unknown) => (v === '' || v === undefined ? null : v);

export const optText = z.preprocess(blank, z.string().trim().nullable()).optional();

export const optDate = z
  .preprocess(blank, z.string().refine((s) => isValidDate(s.slice(0, 10)), 'Tanggal tidak valid').transform((s) => s.slice(0, 10)).nullable())
  .optional();

export const requiredDate = z.string().refine(isValidDate, 'Tanggal tidak valid (format YYYY-MM-DD)');

export const optEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blank, z.enum(values).nullable()).optional();

export const id = z.coerce.number().int().positive();

export const yearJoin = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d{4}$/.test(v), 'Tahun gabung harus 4 digit')
  .transform(Number);

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
});

export type Page = z.infer<typeof pageQuery>;

export function pageMeta(page: Page, total: number) {
  return { page: page.page, limit: page.limit, total, last_page: Math.max(1, Math.ceil(total / page.limit)) };
}

export const nowIso = () => new Date().toISOString();
