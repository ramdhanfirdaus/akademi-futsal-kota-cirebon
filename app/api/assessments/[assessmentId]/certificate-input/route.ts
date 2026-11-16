import { idParam, ok, route } from '@/server/http';
import { certificateInput, toJsonInput } from '@/server/services/assessments/certificates';

type P = { assessmentId: string };

/** For building certificates in the admin's browser (ZIP of all, template preview). */
export const GET = route<P>({ roles: ['ADMIN'] }, async ({ db, actor, params }) =>
  ok(toJsonInput(await certificateInput(db, actor!, idParam(params.assessmentId)))),
);
