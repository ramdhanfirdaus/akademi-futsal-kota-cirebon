import 'server-only';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { assessmentAspects, assessmentSemesters, assessmentTemplates, assessments } from '../../db/schema';
import type { Db } from '../../db';
import { conflict, invalid, notFound } from '../../errors';
import { nowIso, optDate, reqText } from '../../validation';
import { SEQ_TOKEN, TRACKS, type Track } from '@/lib/assessment';
import type { Tx } from '../users';

export type AspectDTO = { id: number; name: string; sort_order: number };
export type SemesterStatus = 'DRAFT' | 'PUBLISHED';
export type SemesterDTO = {
  id: number;
  name: string;
  number_format: string;
  certificate_date: string | null;
  status: SemesterStatus;
  first_published_at: string | null;
  published_at: string | null;
  aspects: Record<Track, AspectDTO[]>;
  has_template: Record<Track, boolean>;
};

export const LOCKED_FORMAT = 'Format nomor sudah terkunci karena sertifikat sudah diterbitkan';
export const PUBLISHED_LOCK = 'Semester sudah diterbitkan; batalkan terbit untuk mengubah nilai';

const numberFormat = z
  .string()
  .trim()
  .min(1)
  .max(255, 'Maksimal 255 karakter')
  .refine((s) => s.includes(SEQ_TOKEN), `Format nomor harus memuat ${SEQ_TOKEN}`);

const createSchema = z.object({ name: reqText, number_format: numberFormat });
const updateSchema = z.object({
  name: reqText.optional(),
  number_format: numberFormat.optional(),
  certificate_date: optDate,
});
const aspectsSchema = z
  .array(
    z.object({
      id: z.coerce.number().int().positive().optional(),
      name: reqText,
    }),
  )
  .max(50, 'Maksimal 50 aspek')
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((a, i) => {
      const key = a.name.toLowerCase();
      if (seen.has(key))
        ctx.addIssue({
          code: 'custom',
          path: [i, 'name'],
          message: 'Nama aspek tidak boleh sama',
        });
      seen.add(key);
    });
  });
export const trackSchema = z.enum(TRACKS, 'Jalur harus PLAYER atau GOALKEEPER');

type SemesterRow = typeof assessmentSemesters.$inferSelect;

/** Throws 404 for a missing or deleted semester. */
export async function semesterRow(db: Db | Tx, id: number): Promise<SemesterRow> {
  const [row] = await db
    .select()
    .from(assessmentSemesters)
    .where(and(eq(assessmentSemesters.id, id), isNull(assessmentSemesters.deletedAt)));
  if (!row) throw notFound();
  return row;
}

/** Like semesterRow, but locks the row until the transaction ends, so publish and edits never interleave. */
export async function lockSemester(tx: Tx, id: number): Promise<SemesterRow> {
  const [row] = await tx
    .select()
    .from(assessmentSemesters)
    .where(and(eq(assessmentSemesters.id, id), isNull(assessmentSemesters.deletedAt)))
    .for('update');
  if (!row) throw notFound();
  return row;
}

/** Aspects of each semester grouped by track, in order. */
export async function semesterAspects(db: Db | Tx, semesterIds: number[]): Promise<Map<number, Record<Track, AspectDTO[]>>> {
  const out = new Map<number, Record<Track, AspectDTO[]>>();
  for (const id of semesterIds) out.set(id, { PLAYER: [], GOALKEEPER: [] });
  if (!semesterIds.length) return out;
  const rows = await db
    .select()
    .from(assessmentAspects)
    .where(inArray(assessmentAspects.semesterId, semesterIds))
    .orderBy(asc(assessmentAspects.sortOrder), asc(assessmentAspects.id));
  for (const r of rows) out.get(r.semesterId)![r.track].push({ id: r.id, name: r.name, sort_order: r.sortOrder });
  return out;
}

async function toDTOs(db: Db | Tx, rows: SemesterRow[]): Promise<SemesterDTO[]> {
  const ids = rows.map((r) => r.id);
  const aspects = await semesterAspects(db, ids);
  const templates = ids.length
    ? await db
        .select({
          semesterId: assessmentTemplates.semesterId,
          track: assessmentTemplates.track,
        })
        .from(assessmentTemplates)
        .where(inArray(assessmentTemplates.semesterId, ids))
    : [];
  const has = (id: number, track: Track) => templates.some((t) => t.semesterId === id && t.track === track);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    number_format: r.numberFormat,
    certificate_date: r.certificateDate,
    status: r.status,
    first_published_at: r.firstPublishedAt,
    published_at: r.publishedAt,
    aspects: aspects.get(r.id)!,
    has_template: {
      PLAYER: has(r.id, 'PLAYER'),
      GOALKEEPER: has(r.id, 'GOALKEEPER'),
    },
  }));
}

/** Newest first. */
export async function listSemesters(db: Db): Promise<SemesterDTO[]> {
  const rows = await db
    .select()
    .from(assessmentSemesters)
    .where(isNull(assessmentSemesters.deletedAt))
    .orderBy(desc(assessmentSemesters.createdAt), desc(assessmentSemesters.id));
  return toDTOs(db, rows);
}

export async function getSemester(db: Db | Tx, id: number): Promise<SemesterDTO> {
  const [dto] = await toDTOs(db, [await semesterRow(db, id)]);
  return dto;
}

/** New draft semester; both tracks' aspects are copied from the most recently created semester. */
export async function createSemester(db: Db, input: unknown): Promise<SemesterDTO> {
  const d = createSchema.parse(input);
  const id = await db.transaction(async (tx) => {
    const [prev] = await tx
      .select({ id: assessmentSemesters.id })
      .from(assessmentSemesters)
      .where(isNull(assessmentSemesters.deletedAt))
      .orderBy(desc(assessmentSemesters.createdAt), desc(assessmentSemesters.id))
      .limit(1);
    const [row] = await tx.insert(assessmentSemesters).values({ name: d.name, numberFormat: d.number_format }).returning({ id: assessmentSemesters.id });
    if (prev) {
      const old = await tx.select().from(assessmentAspects).where(eq(assessmentAspects.semesterId, prev.id));
      if (old.length) {
        await tx.insert(assessmentAspects).values(
          old.map((a) => ({
            semesterId: row.id,
            track: a.track,
            name: a.name,
            sortOrder: a.sortOrder,
          })),
        );
      }
    }
    return row.id;
  });
  return getSemester(db, id);
}

export async function updateSemester(db: Db, id: number, input: unknown): Promise<SemesterDTO> {
  const d = updateSchema.parse(input);
  const row = await semesterRow(db, id);
  if (d.number_format !== undefined && d.number_format !== row.numberFormat && row.firstPublishedAt) throw conflict(LOCKED_FORMAT);
  await db
    .update(assessmentSemesters)
    .set({
      ...(d.name !== undefined && { name: d.name }),
      ...(d.number_format !== undefined && { numberFormat: d.number_format }),
      ...(d.certificate_date !== undefined && {
        certificateDate: d.certificate_date,
      }),
      updatedAt: nowIso(),
    })
    .where(eq(assessmentSemesters.id, id));
  return getSemester(db, id);
}

/** Soft delete; refused once certificates have been issued. */
export async function deleteSemester(db: Db, id: number): Promise<void> {
  const row = await semesterRow(db, id);
  if (row.firstPublishedAt) throw conflict('Semester yang sudah pernah diterbitkan tidak bisa dihapus');
  await db.update(assessmentSemesters).set({ deletedAt: nowIso() }).where(eq(assessmentSemesters.id, id));
}

/**
 * Replaces one track's aspect list (draft semesters only). Listed ids are kept (renamed/reordered),
 * entries without an id are added, missing ones are deleted together with their scores.
 */
export async function saveAspects(db: Db, id: number, trackInput: unknown, input: unknown): Promise<SemesterDTO> {
  const track = trackSchema.parse(trackInput);
  const list = aspectsSchema.parse(input);
  await db.transaction(async (tx) => {
    const row = await lockSemester(tx, id);
    if (row.status !== 'DRAFT') throw conflict('Semester sudah diterbitkan; batalkan terbit untuk mengubah aspek');
    const where = and(eq(assessmentAspects.semesterId, id), eq(assessmentAspects.track, track));
    const existing = await tx.select({ id: assessmentAspects.id }).from(assessmentAspects).where(where);
    const known = new Set(existing.map((a) => a.id));
    const errors: Record<string, string[]> = {};
    list.forEach((a, i) => {
      if (a.id !== undefined && !known.has(a.id)) errors[`${i}.id`] = ['Aspek tidak ditemukan'];
    });
    if (Object.keys(errors).length) throw invalid(errors);

    const keep = new Set(list.flatMap((a) => (a.id ? [a.id] : [])));
    const removed = existing.filter((a) => !keep.has(a.id)).map((a) => a.id);
    if (removed.length) {
      await tx.delete(assessmentAspects).where(inArray(assessmentAspects.id, removed));
      for (const aspectId of removed) {
        await tx
          .update(assessments)
          .set({
            scores: sql`${assessments.scores} - ${String(aspectId)}::text`,
          })
          .where(and(eq(assessments.semesterId, id), eq(assessments.track, track)));
      }
      // A removed aspect's spot on the certificate template goes too.
      const gone = new Set(removed.map((r) => `aspect:${r}`));
      const tmpl = and(eq(assessmentTemplates.semesterId, id), eq(assessmentTemplates.track, track));
      const [t] = await tx.select({ fields: assessmentTemplates.fields }).from(assessmentTemplates).where(tmpl);
      if (t && t.fields.some((f) => gone.has(f.key))) {
        await tx
          .update(assessmentTemplates)
          .set({ fields: t.fields.filter((f) => !gone.has(f.key)) })
          .where(tmpl);
      }
    }
    // Two passes so the (semester, track, sort_order) unique constraint never sees a duplicate mid-update.
    for (const [i, a] of list.entries()) {
      if (a.id)
        await tx
          .update(assessmentAspects)
          .set({ sortOrder: -(i + 1) })
          .where(eq(assessmentAspects.id, a.id));
    }
    for (const [i, a] of list.entries()) {
      if (a.id) await tx.update(assessmentAspects).set({ name: a.name, sortOrder: i }).where(eq(assessmentAspects.id, a.id));
      else await tx.insert(assessmentAspects).values({ semesterId: id, track, name: a.name, sortOrder: i });
    }
    await tx.update(assessmentSemesters).set({ updatedAt: nowIso() }).where(eq(assessmentSemesters.id, id));
  });
  return getSemester(db, id);
}
