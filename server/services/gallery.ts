import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { galleryPhotos } from '../db/schema';
import type { Db } from '../db';
import { notFound } from '../errors';
import { imageData, nowIso, optText } from '../validation';

export const MAX_GALLERY_BYTES = 1024 * 1024; // the browser resizes to ~1600px JPEG first

const createSchema = z.object({ photo: imageData(MAX_GALLERY_BYTES), caption: optText });
const updateSchema = z.object({ caption: optText });

export type GalleryItem = { id: number; caption: string | null; url: string; created_at: string };

const columns = { id: galleryPhotos.id, caption: galleryPhotos.caption, createdAt: galleryPhotos.createdAt, updatedAt: galleryPhotos.updatedAt };

function toItem(r: { id: number; caption: string | null; createdAt: string; updatedAt: string }): GalleryItem {
  return { id: r.id, caption: r.caption, url: `/api/gallery/${r.id}/photo?v=${encodeURIComponent(r.updatedAt)}`, created_at: r.createdAt };
}

/** Newest first; never includes the image bytes. */
export async function listGallery(db: Db): Promise<GalleryItem[]> {
  const rows = await db.select(columns).from(galleryPhotos).orderBy(desc(galleryPhotos.createdAt), desc(galleryPhotos.id));
  return rows.map(toItem);
}

export async function addGalleryPhoto(db: Db, input: unknown): Promise<GalleryItem> {
  const d = createSchema.parse(input);
  const [row] = await db
    .insert(galleryPhotos)
    .values({ caption: d.caption ?? null, photo: d.photo.bytes, photoType: d.photo.type })
    .returning(columns);
  return toItem(row);
}

export async function updateGalleryPhoto(db: Db, id: number, input: unknown): Promise<GalleryItem> {
  const d = updateSchema.parse(input);
  const [row] = await db
    .update(galleryPhotos)
    .set({ caption: d.caption ?? null, updatedAt: nowIso() })
    .where(eq(galleryPhotos.id, id))
    .returning(columns);
  if (!row) throw notFound();
  return toItem(row);
}

export async function deleteGalleryPhoto(db: Db, id: number): Promise<void> {
  const rows = await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id)).returning({ id: galleryPhotos.id });
  if (!rows.length) throw notFound();
}

export async function getGalleryPhoto(db: Db, id: number): Promise<{ type: string; bytes: Uint8Array }> {
  const [row] = await db.select({ photo: galleryPhotos.photo, type: galleryPhotos.photoType }).from(galleryPhotos).where(eq(galleryPhotos.id, id));
  if (!row) throw notFound();
  return { type: row.type, bytes: row.photo };
}
