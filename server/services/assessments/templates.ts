import 'server-only';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { assessmentTemplates } from '../../db/schema';
import type { Db } from '../../db';
import { invalid, notFound } from '../../errors';
import { nowIso } from '../../validation';
import { ALIGNS, BASE_FIELD_KEYS, FONTS, type TemplateField, type Track } from '@/lib/assessment';
import type { Tx } from '../users';
import { semesterRow, trackSchema } from './semesters';
import { trackAspects } from './grades';

export const MAX_TEMPLATE_BYTES = 4 * 1024 * 1024;
const BAD_IMAGE = 'Template harus PNG atau JPG, maksimal 4 MB';
const DATA_URL = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;

/** Checks the real file signature too, so a renamed non-image is refused. */
function decodeImage(dataUrl: unknown): {
  type: 'image/png' | 'image/jpeg';
  bytes: Buffer;
} {
  const m = typeof dataUrl === 'string' ? DATA_URL.exec(dataUrl) : null;
  if (!m) throw invalid({ image: [BAD_IMAGE] });
  const type = m[1] as 'image/png' | 'image/jpeg';
  const bytes = Buffer.from(m[2], 'base64');
  const png = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (bytes.length > MAX_TEMPLATE_BYTES || (type === 'image/png' ? !png : !jpg)) throw invalid({ image: [BAD_IMAGE] });
  return { type, bytes };
}

const px = z.coerce.number().int().min(1).max(20000);
const imageSchema = z.object({
  image: z.unknown(),
  width_px: px,
  height_px: px,
});

const fraction = z.number().min(0).max(1);
const fieldSchema = z.object({
  key: z.string(),
  x: fraction,
  y: fraction,
  width: z.number().gt(0).max(1),
  fontSize: z.number().min(4).max(120),
  font: z.enum(FONTS),
  align: z.enum(ALIGNS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Warna harus berformat #rrggbb'),
});
const fieldsSchema = z.array(fieldSchema).max(100);

export type TemplateMeta = {
  image_url: string;
  image_type: string;
  width_px: number;
  height_px: number;
  fields: TemplateField[];
  updated_at: string;
};

const where = (semesterId: number, track: Track) => and(eq(assessmentTemplates.semesterId, semesterId), eq(assessmentTemplates.track, track));

export async function saveTemplateImage(db: Db, semesterId: number, trackInput: unknown, input: unknown): Promise<void> {
  const track = trackSchema.parse(trackInput);
  const d = imageSchema.parse(input);
  const img = decodeImage(d.image);
  await semesterRow(db, semesterId);
  await db
    .insert(assessmentTemplates)
    .values({
      semesterId,
      track,
      image: img.bytes,
      imageType: img.type,
      widthPx: d.width_px,
      heightPx: d.height_px,
    })
    .onConflictDoUpdate({
      target: [assessmentTemplates.semesterId, assessmentTemplates.track],
      set: {
        image: img.bytes,
        imageType: img.type,
        widthPx: d.width_px,
        heightPx: d.height_px,
        updatedAt: nowIso(),
      },
    });
}

export async function saveTemplateFields(db: Db, semesterId: number, trackInput: unknown, input: unknown): Promise<TemplateMeta> {
  const track = trackSchema.parse(trackInput);
  const fields = fieldsSchema.parse(input);
  await semesterRow(db, semesterId);
  const allowed = new Set<string>([...BASE_FIELD_KEYS, ...(await trackAspects(db, semesterId, track)).map((a) => `aspect:${a.id}`)]);
  const errors: Record<string, string[]> = {};
  fields.forEach((f, i) => {
    if (!allowed.has(f.key)) errors[`${i}.key`] = ['Isian tidak dikenal'];
  });
  if (Object.keys(errors).length) throw invalid(errors);
  const rows = await db
    .update(assessmentTemplates)
    .set({ fields, updatedAt: nowIso() })
    .where(where(semesterId, track))
    .returning({ track: assessmentTemplates.track });
  if (!rows.length) throw notFound();
  return (await getTemplateMeta(db, semesterId, track))!;
}

export async function getTemplate(db: Db | Tx, semesterId: number, track: Track) {
  const [row] = await db.select().from(assessmentTemplates).where(where(semesterId, track));
  if (!row) return null;
  return {
    image: row.image,
    image_type: row.imageType as 'image/png' | 'image/jpeg',
    width_px: row.widthPx,
    height_px: row.heightPx,
    fields: row.fields,
    updated_at: row.updatedAt,
  };
}

export async function getTemplateMeta(db: Db, semesterId: number, trackInput: unknown): Promise<TemplateMeta | null> {
  const track = trackSchema.parse(trackInput);
  const [row] = await db
    .select({
      imageType: assessmentTemplates.imageType,
      widthPx: assessmentTemplates.widthPx,
      heightPx: assessmentTemplates.heightPx,
      fields: assessmentTemplates.fields,
      updatedAt: assessmentTemplates.updatedAt,
    })
    .from(assessmentTemplates)
    .where(where(semesterId, track));
  if (!row) return null;
  return {
    image_url: `/api/assessments/semesters/${semesterId}/templates/${track}/image?v=${encodeURIComponent(row.updatedAt)}`,
    image_type: row.imageType,
    width_px: row.widthPx,
    height_px: row.heightPx,
    fields: row.fields,
    updated_at: row.updatedAt,
  };
}
