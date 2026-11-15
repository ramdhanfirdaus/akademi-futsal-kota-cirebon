import { ok, query, readJson, route } from '@/server/http';
import { createCoach, listCoaches } from '@/server/services/coaches';

export const GET = route({ roles: ['ADMIN'] }, async ({ req, db }) => {
  const { items, meta } = await listCoaches(db, query(req));
  return ok(items, 'Coaches retrieved successfully', 200, meta);
});

export const POST = route({ roles: ['ADMIN'] }, async ({ req, db }) =>
  ok(await createCoach(db, await readJson(req)), 'Coach created successfully', 201),
);
