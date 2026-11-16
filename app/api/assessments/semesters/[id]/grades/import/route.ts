import { STAFF, idParam, ok, readJson, route } from '@/server/http';
import { importGrades } from '@/server/services/assessments/gradeImport';

type P = { id: string };

export const POST = route<P>({ roles: STAFF }, async ({ req, db, actor, params }) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  const res = await importGrades(db, actor!, { ...body, semester_id: idParam(params.id) });
  return ok(res, res.dry_run ? 'File valid' : `${res.count} nilai siswa disimpan`);
});
