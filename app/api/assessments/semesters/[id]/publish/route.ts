import { idParam, ok, route } from '@/server/http';
import { publishSemester, publishSummary, unpublishSemester } from '@/server/services/assessments/publish';

type P = { id: string };

export const GET = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => ok(await publishSummary(db, idParam(params.id))));

export const POST = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => ok(await publishSemester(db, idParam(params.id)), 'Nilai diterbitkan'));

export const DELETE = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => ok(await unpublishSemester(db, idParam(params.id)), 'Penerbitan dibatalkan'));
