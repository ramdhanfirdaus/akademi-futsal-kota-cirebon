import { STAFF, idParam, ok, readJson, route } from '@/server/http';
import { deleteSemester, getSemester, updateSemester } from '@/server/services/assessments/semesters';

type P = { id: string };

export const GET = route<P>({ roles: STAFF }, async ({ db, params }) => ok(await getSemester(db, idParam(params.id))));

export const PATCH = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) =>
  ok(await updateSemester(db, idParam(params.id), await readJson(req)), 'Semester disimpan'),
);

export const DELETE = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => {
  await deleteSemester(db, idParam(params.id));
  return ok(null, 'Semester dihapus');
});
