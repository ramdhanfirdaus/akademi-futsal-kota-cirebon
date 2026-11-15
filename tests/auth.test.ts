import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { makeCoach } from './helpers/fixtures';
import { hashPassword, loadActor, signSession, verifyPassword, verifySession } from '@/server/auth';
import { changePassword, login } from '@/server/services/auth';
import { AppError } from '@/server/errors';
import { users } from '@/server/db/schema';
import type { Db } from '@/server/db';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
});

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('password & session', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('rahasia');
    expect(await verifyPassword('rahasia', hash)).toBe(true);
    expect(await verifyPassword('salah', hash)).toBe(false);
  });

  it('signs and verifies sessions', async () => {
    const token = await signSession({ userId: 5, role: 'COACH' });
    expect(await verifySession(token)).toEqual({ userId: 5, role: 'COACH', sessionVersion: 0 });
    expect(await verifySession(token.slice(0, -2) + 'xx')).toBeNull();
    expect(await verifySession('garbage')).toBeNull();
  });
});

describe('login', () => {
  it('logs in active users only', async () => {
    const { userId } = await makeCoach(db, { username: 'coach01', password: await hashPassword('pw') });
    expect(await login(db, 'coach01', 'pw')).toMatchObject({ userId, role: 'COACH', username: 'coach01' });
    expect(await login(db, 'coach01', 'nope')).toBeNull();
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    expect(await login(db, 'coach01', 'pw')).toBeNull();
  });

  it('loadActor rejects inactive users even with a valid token', async () => {
    const { userId } = await makeCoach(db);
    const token = await signSession({ userId, role: 'COACH' });
    expect(await loadActor(db, token)).toMatchObject({ userId, role: 'COACH' });
    await db.update(users).set({ status: 'INACTIVE' }).where(eq(users.id, userId));
    expect(await loadActor(db, token)).toBeNull();
    expect(await loadActor(db, undefined)).toBeNull();
  });
});

describe('changePassword', () => {
  it('rejects a wrong old password', async () => {
    const { userId } = await makeCoach(db, { username: 'c1', password: await hashPassword('lama123') });
    const actor = { userId, role: 'COACH' as const, username: 'c1' };
    const err = await changePassword(db, actor, { old_password: 'salah', new_password: 'baru123' }).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(422);
    expect(err.errors).toHaveProperty('old_password');
  });

  it('changes the password', async () => {
    const { userId } = await makeCoach(db, { username: 'c2', password: await hashPassword('lama123') });
    await changePassword(db, { userId, role: 'COACH', username: 'c2' }, { old_password: 'lama123', new_password: 'baru123' });
    expect(await login(db, 'c2', 'baru123')).not.toBeNull();
  });
});
