import { STAFF, idParam, ok, readJson, route } from '@/server/http';
import { deleteCoach, getCoach, updateCoach } from '@/server/services/coaches';

type P = { id: string };

export const GET = route<P>({ roles: STAFF }, async ({ db, actor, params }) => ok(await getCoach(db, actor!, idParam(params.id))));

export const PUT = route<P>({ roles: STAFF, refreshLanding: true }, async ({ req, db, actor, params }) =>
  ok(await updateCoach(db, actor!, idParam(params.id), await readJson(req)), 'Coach updated successfully'),
);

export const DELETE = route<P>({ roles: ['ADMIN'], refreshLanding: true }, async ({ db, params }) => {
  await deleteCoach(db, idParam(params.id));
  return ok(null, 'Coach deleted successfully');
});
