import { STAFF, ok, readJson, route } from '@/server/http';
import { createClass, listClasses } from '@/server/services/classes';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await listClasses(db), 'Classes retrieved successfully'));

export const POST = route({ roles: STAFF }, async ({ req, db }) =>
  ok(await createClass(db, await readJson(req)), 'Class created successfully', 201),
);
