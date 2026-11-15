import { ok, query, readJson, route } from '@/server/http';
import { createAdmin, listAdmins } from '@/server/services/admins';

export const GET = route({ roles: ['ADMIN'] }, async ({ req, db }) => {
  const { items, meta } = await listAdmins(db, query(req));
  return ok(items, 'Admins retrieved successfully', 200, meta);
});

export const POST = route({ roles: ['ADMIN'] }, async ({ req, db }) =>
  ok(await createAdmin(db, await readJson(req)), 'Admin created successfully', 201),
);
