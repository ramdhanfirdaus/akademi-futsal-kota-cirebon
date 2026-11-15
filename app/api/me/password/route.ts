import { EVERYONE, ok, readJson, route } from '@/server/http';
import { sessionCookieHeader, signSession } from '@/server/auth';
import { changePassword } from '@/server/services/auth';

export const PUT = route({ roles: EVERYONE }, async ({ req, db, actor }) => {
  const { sessionVersion } = await changePassword(db, actor!, await readJson(req));
  // Other devices are signed out; keep this one signed in with a fresh cookie.
  const res = ok(null, 'Password berhasil diubah');
  res.headers.append('Set-Cookie', sessionCookieHeader(await signSession({ ...actor!, sessionVersion })));
  return res;
});
