import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeClass, makeCoach } from './helpers/fixtures';
import { classes, users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import { publicOverview } from '@/server/services/public';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('publicOverview', () => {
  it('lists active classes with schedules and coaches with their classes, without account data', async () => {
    const fathur = await makeCoach(db, { name: 'Fathur Rahman', nickname: 'Fathur' });
    const gone = await makeCoach(db, { name: 'Lama' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, gone.userId));
    await makeClass(db, { coachId: fathur.coachId, name: 'KIPER', schedules: [{ day_of_week: 6, start_time: '08:00', end_time: '10:00' }] });
    const { classId: old } = await makeClass(db, { coachId: fathur.coachId, name: 'Hapus' });
    await db.update(classes).set({ deletedAt: new Date().toISOString() }).where(eq(classes.id, old));

    const o = await publicOverview(db);
    expect(o.classes).toEqual([
      { name: 'KIPER', coach: 'Fathur', schedules: [{ day_of_week: 6, start_time: '08:00', end_time: '10:00' }] },
    ]);
    expect(o.coaches).toEqual([{ name: 'Fathur Rahman', nickname: 'Fathur', classes: ['KIPER'] }]);
    expect(JSON.stringify(o)).not.toMatch(/username|password|user_id/);
  });
});
