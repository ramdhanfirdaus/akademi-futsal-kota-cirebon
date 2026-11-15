import 'server-only';
import { asc, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { classes } from '../db/schema';
import type { Db } from '../db';
import { invalid } from '../errors';
import { zodErrors } from '../http';
import { createSchema, insertStudent, type NewStudent } from './students';
import { withUsernameRetry } from './users';

export const MAX_IMPORT_ROWS = 500;
/** Row 1 of the spreadsheet is the header, so data row i is spreadsheet row i + 2. */
const sheetRow = (i: number) => i + 2;

const bodySchema = z.object({
  dry_run: z.boolean().optional(),
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, 'File tidak berisi data siswa')
    .max(MAX_IMPORT_ROWS, `Maksimal ${MAX_IMPORT_ROWS} siswa sekali impor`),
});

const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const normClass = (s: string) => s.trim().toLowerCase().replace(/^kelas\s+/, '').replace(/\s+/g, ' ');

/** Friendly spreadsheet values → API values. Unknown values pass through so validation reports them. */
const GENDER: Record<string, string> = { l: 'MALE', 'laki-laki': 'MALE', laki: 'MALE', pria: 'MALE', male: 'MALE', p: 'FEMALE', perempuan: 'FEMALE', wanita: 'FEMALE', female: 'FEMALE' };
const YES = new Set(['ya', 'y', 'yes', 'true', '1', 'iya']);
const NO = new Set(['tidak', 't', 'no', 'false', '0', '']);

function toInput(raw: Record<string, unknown>, classId: number | undefined): Record<string, unknown> {
  const gender = text(raw.gender).toLowerCase();
  const goalkeeper = text(raw.is_goalkeeper).toLowerCase();
  return {
    name: text(raw.name),
    nickname: text(raw.nickname),
    class_id: classId,
    password: text(raw.password),
    position: text(raw.position).toUpperCase(),
    year_join: text(raw.year_join),
    fee_start: text(raw.fee_start),
    gender: gender ? (GENDER[gender] ?? gender) : '',
    birth_place: text(raw.birth_place),
    birth_date: text(raw.birth_date),
    blood_type: text(raw.blood_type).toUpperCase(),
    address: text(raw.address),
    parent_name: text(raw.parent_name),
    parent_phone: text(raw.parent_phone),
    disease_history: text(raw.disease_history),
    is_goalkeeper: YES.has(goalkeeper) ? true : NO.has(goalkeeper) ? false : goalkeeper,
  };
}

const FRIENDLY: Record<string, string> = {
  position: 'Posisi harus Anchor, Flank, Pivot, Kiper, atau dikosongkan',
  gender: 'Jenis kelamin harus L atau P',
  blood_type: 'Golongan darah harus A, B, AB, atau O',
  is_goalkeeper: 'Isi "Ya" atau "Tidak"',
};

export type ImportResult = {
  dry_run: boolean;
  count: number;
  created: { row: number; name: string; username: string; class: string }[];
};

/**
 * Imports students from spreadsheet rows (already read in the browser). All or nothing:
 * every row is validated first; if any row has a problem, nothing is saved and every
 * problem is reported as `rows.<spreadsheet row>.<field>`.
 */
export async function importStudents(db: Db, input: unknown): Promise<ImportResult> {
  const { rows, dry_run = false } = bodySchema.parse(input);

  const classRows = await db.select({ id: classes.id, name: classes.name }).from(classes).where(isNull(classes.deletedAt)).orderBy(asc(classes.id));
  const byName = new Map<string, { id: number; name: string }>();
  for (const c of classRows) if (!byName.has(normClass(c.name))) byName.set(normClass(c.name), c);

  const errors: Record<string, string[]> = {};
  const valid: { row: number; data: NewStudent; className: string }[] = [];
  rows.forEach((raw, i) => {
    // The browser skips blank lines, so it sends each row's real spreadsheet line as `_row`.
    const r = typeof raw._row === 'number' && Number.isInteger(raw._row) ? raw._row : sheetRow(i);
    const classText = text(raw.class);
    const cls = classText ? byName.get(normClass(classText)) : undefined;
    if (!classText) errors[`rows.${r}.class`] = ['Kelas wajib diisi'];
    else if (!cls) errors[`rows.${r}.class`] = [`Kelas "${classText}" tidak ditemukan`];

    const parsed = createSchema.safeParse(toInput(raw, cls?.id ?? 1));
    if (!parsed.success) {
      for (const [field, msgs] of Object.entries(zodErrors(parsed.error))) {
        if (field === 'class_id') continue; // reported above as `class`
        errors[`rows.${r}.${field}`] = FRIENDLY[field] ? [FRIENDLY[field]] : msgs;
      }
    } else if (cls) {
      valid.push({ row: r, data: parsed.data, className: cls.name });
    }
  });
  if (Object.keys(errors).length) throw invalid(errors);
  if (dry_run) return { dry_run: true, count: valid.length, created: [] };

  const created = await withUsernameRetry(() =>
    db.transaction(async (tx) => {
      const out: ImportResult['created'] = [];
      for (const v of valid) {
        const { username } = await insertStudent(tx, v.data);
        out.push({ row: v.row, name: v.data.name, username, class: v.className });
      }
      return out;
    }),
  );
  return { dry_run: false, count: created.length, created };
}
