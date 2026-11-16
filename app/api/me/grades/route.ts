import { ok, route } from '@/server/http';
import { myGrades } from '@/server/services/assessments/certificates';

export const GET = route({ roles: ['STUDENT'] }, async ({ db, actor }) => ok(await myGrades(db, actor!)));
