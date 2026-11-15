import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from './helpers/db';
import type { Db } from '@/server/db';
import { addGalleryPhoto, deleteGalleryPhoto, getGalleryPhoto, listGallery, updateGalleryPhoto } from '@/server/services/gallery';
import { fail } from '@/server/http';

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG = `data:image/png;base64,${PNG_B64}`;

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});
const statusOf = async (p: Promise<unknown>) => fail(await p.then(() => null, (e) => e)).status;

describe('gallery', () => {
  it('adds photos with captions and lists them newest first without the bytes', async () => {
    const a = await addGalleryPhoto(db, { photo: PNG, caption: '  Latihan Sabtu ' });
    const b = await addGalleryPhoto(db, { photo: PNG, caption: '' });
    const list = await listGallery(db);
    expect(list.map((p) => p.id)).toEqual([b.id, a.id]);
    expect(list[1]).toMatchObject({ caption: 'Latihan Sabtu' });
    expect(list[0].caption).toBeNull();
    expect(list[0].url).toMatch(new RegExp(`^/api/gallery/${b.id}/photo\\?v=`));
    expect(JSON.stringify(list)).not.toContain(PNG_B64);
  });

  it('serves the stored image', async () => {
    const { id } = await addGalleryPhoto(db, { photo: PNG });
    const p = await getGalleryPhoto(db, id);
    expect(p.type).toBe('image/png');
    expect(Buffer.from(p.bytes).toString('base64')).toBe(PNG_B64);
  });

  it('edits the caption and deletes photos', async () => {
    const { id } = await addGalleryPhoto(db, { photo: PNG, caption: 'Lama' });
    expect((await updateGalleryPhoto(db, id, { caption: 'Turnamen U-12' })).caption).toBe('Turnamen U-12');
    await deleteGalleryPhoto(db, id);
    expect(await listGallery(db)).toEqual([]);
    expect(await statusOf(getGalleryPhoto(db, id))).toBe(404);
    expect(await statusOf(deleteGalleryPhoto(db, id))).toBe(404);
  });

  it('rejects missing, non-image and oversized photos and long captions', async () => {
    expect(await statusOf(addGalleryPhoto(db, { caption: 'x' }))).toBe(422);
    expect(await statusOf(addGalleryPhoto(db, { photo: 'data:image/gif;base64,R0lGOD' }))).toBe(422);
    const big = `data:image/jpeg;base64,${Buffer.alloc(1100 * 1024).toString('base64')}`;
    expect(await statusOf(addGalleryPhoto(db, { photo: big }))).toBe(422);
    expect(await statusOf(addGalleryPhoto(db, { photo: PNG, caption: 'x'.repeat(256) }))).toBe(422);
  });
});
