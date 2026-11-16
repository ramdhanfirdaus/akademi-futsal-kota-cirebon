import { idParam, ok, readJson, route } from '@/server/http';
import { getTemplateMeta, saveTemplateFields } from '@/server/services/assessments/templates';
import { semesterRow } from '@/server/services/assessments/semesters';

type P = { id: string; track: string };

export const GET = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => {
  const id = idParam(params.id);
  await semesterRow(db, id);
  return ok(await getTemplateMeta(db, id, params.track));
});

export const PUT = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) => {
  const body = (await readJson(req)) as { fields?: unknown };
  return ok(await saveTemplateFields(db, idParam(params.id), params.track, body.fields), 'Posisi isian disimpan');
});
