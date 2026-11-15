import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeAdmin, makeCoach } from './helpers/fixtures';
import { users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import { getCoach, getCoachPhoto, updateCoach } from '@/server/services/coaches';
import { publicOverview } from '@/server/services/public';
import { fail } from '@/server/http';

// 1x1 transparent PNG
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const PNG = `data:image/png;base64,${PNG_B64}`;

let db: Db;
let admin: Actor;
let coachId: number;
let coachUser: number;
beforeEach(async () => {
  db = await createTestDb();
  const a = await makeAdmin(db);
  admin = { userId: a.userId, role: 'ADMIN', username: 'admin' };
  ({ coachId, userId: coachUser } = await makeCoach(db, { name: 'Fathur Rizki', nickname: 'Fathur' }));
});

const base = { name: 'Fathur Rizki', nickname: 'Fathur' };
const statusOf = async (p: Promise<unknown>) => fail(await p.then(() => null, (e) => e)).status;

describe('coach profile', () => {
  it('saves experience, certifications and a photo', async () => {
    const c = await updateCoach(db, admin, coachId, {
      ...base,
      experience: 'Pelatih futsal sejak 2015.',
      certifications: ['  Lisensi D AFC Futsal ', '', 'Pelatih Kiper Level 1'],
      photo: PNG,
    });
    expect(c.experience).toBe('Pelatih futsal sejak 2015.');
    expect(c.certifications).toEqual(['Lisensi D AFC Futsal', 'Pelatih Kiper Level 1']);
    expect(c.photo_url?.startsWith(`/api/coaches/${coachId}/photo?v=`)).toBe(true);

    const photo = await getCoachPhoto(db, coachId);
    expect(photo.type).toBe('image/png');
    expect(Buffer.from(photo.bytes).toString('base64')).toBe(PNG_B64);
  });

  it('keeps the photo when omitted and removes it with null', async () => {
    await updateCoach(db, admin, coachId, { ...base, photo: PNG });
    expect((await updateCoach(db, admin, coachId, base)).photo_url).not.toBeNull();
    expect((await updateCoach(db, admin, coachId, { ...base, photo: null })).photo_url).toBeNull();
    expect(await statusOf(getCoachPhoto(db, coachId))).toBe(404);
  });

  it('defaults to no photo and no certifications', async () => {
    expect(await getCoach(db, admin, coachId)).toMatchObject({ photo_url: null, experience: null, certifications: [] });
  });

  it('rejects non-image data and oversized photos', async () => {
    expect(await statusOf(updateCoach(db, admin, coachId, { ...base, photo: 'data:image/gif;base64,R0lGOD' }))).toBe(422);
    expect(await statusOf(updateCoach(db, admin, coachId, { ...base, photo: 'bukan-gambar' }))).toBe(422);
    const big = `data:image/jpeg;base64,${Buffer.alloc(600 * 1024).toString('base64')}`;
    expect(await statusOf(updateCoach(db, admin, coachId, { ...base, photo: big }))).toBe(422);
    expect(await statusOf(updateCoach(db, admin, coachId, { ...base, certifications: Array(21).fill('x') }))).toBe(422);
  });

  it('hides photos of deactivated coaches', async () => {
    await updateCoach(db, admin, coachId, { ...base, photo: PNG });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, coachUser));
    expect(await statusOf(getCoachPhoto(db, coachId))).toBe(404);
  });

  it('shows the profile on the public overview', async () => {
    await updateCoach(db, admin, coachId, { ...base, experience: 'Sejak 2015', certifications: ['Lisensi D'], photo: PNG });
    const [c] = (await publicOverview(db)).coaches;
    expect(c).toMatchObject({ name: 'Fathur Rizki', experience: 'Sejak 2015', certifications: ['Lisensi D'] });
    expect(c.photo_url).toMatch(/^\/api\/coaches\/\d+\/photo\?v=/);
  });
});
