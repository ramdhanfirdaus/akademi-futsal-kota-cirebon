import { idParam, ok, readJson, route } from '@/server/http';
import { deleteAdmin, updateAdmin } from '@/server/services/admins';

type P = { id: string };

export const PUT = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) =>
  ok(await updateAdmin(db, idParam(params.id), await readJson(req)), 'Admin updated successfully'),
);

export const DELETE = route<P>({ roles: ['ADMIN'] }, async ({ db, actor, params }) => {
  await deleteAdmin(db, actor!, idParam(params.id));
  return ok(null, 'Admin deleted successfully');
});
