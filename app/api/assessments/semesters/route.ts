import { STAFF, ok, readJson, route } from '@/server/http';
import { createSemester, listSemesters } from '@/server/services/assessments/semesters';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await listSemesters(db)));

export const POST = route({ roles: ['ADMIN'] }, async ({ req, db }) => ok(await createSemester(db, await readJson(req)), 'Semester dibuat', 201));
