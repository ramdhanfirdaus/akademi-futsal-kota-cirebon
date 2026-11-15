import { readJson, ok, route } from '@/server/http';
import { AppError } from '@/server/errors';
import { sessionCookieHeader, signSession } from '@/server/auth';
import { login, me } from '@/server/services/auth';

export const POST = route({}, async ({ req, db }) => {
  const body = (await readJson(req)) as { username?: unknown; password?: unknown };
  const actor = await login(db, String(body.username ?? ''), String(body.password ?? ''));
  if (!actor) throw new AppError(401, 'Invalid credentials');
  const res = ok({ user: await me(db, actor) }, 'Login successful');
  res.headers.append('Set-Cookie', sessionCookieHeader(await signSession(actor)));
  return res;
});
