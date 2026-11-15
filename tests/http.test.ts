import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createTestDb } from './helpers/db';
import { makeCoach, makeUser } from './helpers/fixtures';
import type { Db } from '@/server/db';

let db: Db;
vi.mock('@/server/db', () => ({ getDb: () => db }));

const { route, ok } = await import('@/server/http');
const { signSession, SESSION_COOKIE } = await import('@/server/auth');

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
});
beforeEach(async () => {
  db = await createTestDb();
});

async function req(token?: string) {
  return new Request('http://localhost/api/x', { headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {} });
}
const ctx = { params: Promise.resolve({}) };

describe('route()', () => {
  it('returns 401 without a session', async () => {
    const h = route({ roles: ['ADMIN'] }, async () => ok(null));
    const res = await h(await req(), ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ status: 'error', message: 'Unauthenticated' });
  });

  it('clears the cookie when a token no longer maps to an active user', async () => {
    const u = await makeUser(db, 'COACH', { status: 'INACTIVE' });
    const h = route({ roles: ['COACH'] }, async () => ok(null));
    const res = await h(await req(await signSession({ userId: u.id, role: 'COACH' })), ctx);
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toMatch(new RegExp(`^${SESSION_COOKIE}=;.*Max-Age=0`));
  });

  it('does not touch cookies for anonymous 401s', async () => {
    const h = route({ roles: ['ADMIN'] }, async () => ok(null));
    expect((await h(await req(), ctx)).headers.get('set-cookie')).toBeNull();
  });

  it('returns 403 for the wrong role', async () => {
    const u = await makeUser(db, 'STUDENT');
    const h = route({ roles: ['ADMIN'] }, async () => ok(null));
    const res = await h(await req(await signSession({ userId: u.id, role: 'STUDENT' })), ctx);
    expect(res.status).toBe(403);
  });

  it('passes the actor to the handler', async () => {
    const { userId } = await makeCoach(db);
    const h = route({ roles: ['COACH'] }, async ({ actor }) => ok({ id: actor!.userId }));
    const res = await h(await req(await signSession({ userId, role: 'COACH' })), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'success', data: { id: userId } });
  });

  it('maps zod errors to 422', async () => {
    const h = route({}, async () => {
      z.object({ name: z.string() }).parse({});
      return ok(null);
    });
    const res = await h(await req(), ctx);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toBe('Validation failed');
    expect(body.errors).toHaveProperty('name');
  });

  it('maps unique violations to 409', async () => {
    const h = route({}, async () => {
      throw Object.assign(new Error('dup'), { code: '23505' });
    });
    expect((await h(await req(), ctx)).status).toBe(409);
  });

  it('maps unknown errors to 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const h = route({}, async () => {
      throw new Error('boom');
    });
    const res = await h(await req(), ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe('Internal Server Error');
    spy.mockRestore();
  });
});
