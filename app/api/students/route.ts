import { STAFF, ok, query, readJson, route } from '@/server/http';
import { createStudent, listStudents } from '@/server/services/students';

export const GET = route({ roles: STAFF }, async ({ req, db }) => {
  const { items, meta } = await listStudents(db, query(req));
  return ok(items, 'Students retrieved successfully', 200, meta);
});

export const POST = route({ roles: STAFF }, async ({ req, db }) =>
  ok(await createStudent(db, await readJson(req)), 'Student created successfully', 201),
);
