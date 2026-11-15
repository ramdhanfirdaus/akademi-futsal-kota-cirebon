import { EVERYONE, ok, readJson, route } from '@/server/http';
import { changePassword } from '@/server/services/auth';

export const PUT = route({ roles: EVERYONE }, async ({ req, db, actor }) => {
  await changePassword(db, actor!, await readJson(req));
  return ok(null, 'Password berhasil diubah');
});
