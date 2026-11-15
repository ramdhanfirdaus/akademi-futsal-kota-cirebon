import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeAdmin } from './helpers/fixtures';
import { users } from '@/server/db/schema';
import type { Db } from '@/server/db';
import type { Actor } from '@/server/auth';
import {
  allActiveCoaches, createCoach, deleteCoach, getCoach, listCoaches, updateCoach,
} from '@/server/services/coaches';
import { createAdmin, deleteAdmin, listAdmins } from '@/server/services/admins';

let db: Db;
let admin: Actor;

async function statusOf(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u.status;
}

beforeEach(async () => {
  db = await createTestDb();
  const { userId } = await makeAdmin(db, { username: 'root' });
  admin = { userId, role: 'ADMIN', username: 'root' };
});

describe('coaches', () => {
  it('deleteCoach deactivates the right user', async () => {
    const a = await createCoach(db, { name: 'Fathur', nickname: 'Fathur', password: 'pw' });
    const b = await createCoach(db, { name: 'Rizal', nickname: 'Rizal', password: 'pw' });
    await deleteCoach(db, b.id);
    expect(await statusOf(b.user_id)).toBe('INACTIVE');
    expect(await statusOf(a.user_id)).toBe('ACTIVE');
  });

  it('coach without nickname gets a username from the name', async () => {
    const c = await createCoach(db, { name: 'Andi Wijaya', password: 'pw' });
    expect(c.username).toBe('andi01');
  });

  it('coach cannot edit another coach but can edit self', async () => {
    const a = await createCoach(db, { name: 'A', nickname: 'Aa', password: 'pw' });
    const b = await createCoach(db, { name: 'B', nickname: 'Bb', password: 'pw' });
    const actorA: Actor = { userId: a.user_id, role: 'COACH', username: a.username };
    await expect(updateCoach(db, actorA, b.id, { name: 'X' })).rejects.toMatchObject({ status: 403 });
    await expect(updateCoach(db, actorA, a.id, { name: 'A2', username: a.username })).resolves.toMatchObject({ name: 'A2' });
    await expect(getCoach(db, actorA, a.id)).resolves.toMatchObject({ id: a.id, username: a.username });
  });

  it('allActiveCoaches and listCoaches exclude inactive', async () => {
    await createCoach(db, { name: 'A', nickname: 'Aa', password: 'pw' });
    const b = await createCoach(db, { name: 'B', nickname: 'Bb', password: 'pw' });
    await deleteCoach(db, b.id);
    expect((await allActiveCoaches(db)).map((c) => c.name)).toEqual(['A']);
    expect((await listCoaches(db, {})).meta.total).toBe(1);
  });

  it('admin updates coach password', async () => {
    const a = await createCoach(db, { name: 'A', nickname: 'Aa', password: 'pw' });
    const before = (await db.select().from(users).where(eq(users.id, a.user_id)))[0].password;
    await updateCoach(db, admin, a.id, { name: 'A', username: a.username, password: 'baru' });
    const after = (await db.select().from(users).where(eq(users.id, a.user_id)))[0].password;
    expect(after).not.toBe(before);
  });
});

describe('admins', () => {
  it('creates, lists and refuses to delete self', async () => {
    const created = await createAdmin(db, { username: 'admin2', password: 'pw' });
    expect((await listAdmins(db, {})).meta.total).toBe(2);
    await expect(deleteAdmin(db, admin, admin.userId)).rejects.toMatchObject({ status: 409 });
    await deleteAdmin(db, admin, created.id);
    expect((await listAdmins(db, {})).meta.total).toBe(1);
  });
});
