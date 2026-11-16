import { STAFF, idParam, ok, route } from '@/server/http';
import { semesterResults } from '@/server/services/assessments/publish';

type P = { id: string };

export const GET = route<P>({ roles: STAFF }, async ({ db, params }) => ok(await semesterResults(db, idParam(params.id))));
