import { STAFF, idParam, ok, query, readJson, route } from '@/server/http';
import { getGradeGrid, saveGrades } from '@/server/services/assessments/grades';

type P = { id: string };

export const GET = route<P>({ roles: STAFF }, async ({ req, db, params }) => {
  const q = query(req);
  return ok(await getGradeGrid(db, idParam(params.id), q.class_id, q.track));
});

export const PUT = route<P>({ roles: STAFF }, async ({ req, db, actor, params }) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  return ok(await saveGrades(db, actor!, { ...body, semester_id: idParam(params.id) }), 'Nilai disimpan');
});
