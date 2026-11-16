import { idParam, ok, readJson, route } from '@/server/http';
import { saveAspects } from '@/server/services/assessments/semesters';

type P = { id: string };

export const PUT = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) => {
  const body = (await readJson(req)) as { track?: unknown; aspects?: unknown };
  return ok(await saveAspects(db, idParam(params.id), body.track, body.aspects), 'Aspek disimpan');
});
