import { EVERYONE, STAFF, idParam, ok, readJson, route } from '@/server/http';
import { deleteStudent, getStudent, updateStudent } from '@/server/services/students';

type P = { id: string };

export const GET = route<P>({ roles: EVERYONE }, async ({ db, actor, params }) =>
  ok(await getStudent(db, actor!, idParam(params.id))),
);

export const PUT = route<P>({ roles: EVERYONE }, async ({ req, db, actor, params }) =>
  ok(await updateStudent(db, actor!, idParam(params.id), await readJson(req)), 'Student updated successfully'),
);

export const DELETE = route<P>({ roles: STAFF }, async ({ db, params }) => {
  await deleteStudent(db, idParam(params.id));
  return ok(null, 'Student deleted successfully');
});
