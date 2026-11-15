import { ok, route } from '@/server/http';
import { sessionCookieHeader } from '@/server/auth';

export const POST = route({}, async () => {
  const res = ok(null, 'Logged out successfully');
  res.headers.append('Set-Cookie', sessionCookieHeader(null));
  return res;
});
