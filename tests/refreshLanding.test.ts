import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDb } from './helpers/db';
import { makeUser } from './helpers/fixtures';
import type { Db } from '@/server/db';

let db: Db;
const revalidatePath = vi.fn();
vi.mock('@/server/db', () => ({ getDb: () => db }));
vi.mock('next/cache', () => ({ revalidatePath }));

const { route, ok } = await import('@/server/http');
const { signSession, SESSION_COOKIE } = await import('@/server/auth');
const { AppError } = await import('@/server/errors');

process.env.JWT_SECRET = 'test-secret-test-secret-test-secret';
beforeEach(async () => {
  db = await createTestDb();
  revalidatePath.mockClear();
});

async function call(handler: () => Promise<Response>) {
  const u = await makeUser(db, 'ADMIN');
  const h = route({ roles: ['ADMIN'], refreshLanding: true }, handler);
  const req = new Request('http://localhost/api/x', { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${await signSession({ userId: u.id, role: 'ADMIN' })}` } });
  return h(req, { params: Promise.resolve({}) });
}

describe('refreshLanding', () => {
  it('re-renders the landing page after a successful change', async () => {
    expect((await call(async () => ok(null))).status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('leaves the landing page alone when the change fails', async () => {
    expect((await call(async () => { throw new AppError(422, 'x'); })).status).toBe(422);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
