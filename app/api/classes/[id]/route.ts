import { STAFF, idParam, ok, readJson, route } from '@/server/http';
import { deleteClass, updateClass } from '@/server/services/classes';

type P = { id: string };

export const PUT = route<P>({ roles: STAFF, refreshLanding: true }, async ({ req, db, params }) =>
  ok(await updateClass(db, idParam(params.id), await readJson(req)), 'Class updated successfully'),
);

export const DELETE = route<P>({ roles: STAFF, refreshLanding: true }, async ({ db, params }) => {
  await deleteClass(db, idParam(params.id));
  return ok(null, 'Class deleted successfully');
});
