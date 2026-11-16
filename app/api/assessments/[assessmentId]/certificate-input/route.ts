import { idParam, ok, query, route } from '@/server/http';
import { certificateInput, toJsonInput } from '@/server/services/assessments/certificates';

type P = { assessmentId: string };

/** For building certificates in the admin's browser (ZIP of all, template preview). `?image=0` omits the template bytes. */
export const GET = route<P>({ roles: ['ADMIN'] }, async ({ req, db, actor, params }) =>
  ok(toJsonInput(await certificateInput(db, actor!, idParam(params.assessmentId)), { withImage: query(req).image !== '0' })),
);
