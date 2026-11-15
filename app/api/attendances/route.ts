import { STAFF, ok, query, readJson, route } from '@/server/http';
import { getAttendanceMatrix, saveAttendance } from '@/server/services/attendance';

export const GET = route({ roles: STAFF }, async ({ req, db }) =>
  ok(await getAttendanceMatrix(db, query(req)), 'Attendances retrieved successfully'),
);

export const POST = route({ roles: STAFF }, async ({ req, db }) => {
  await saveAttendance(db, await readJson(req));
  return ok(null, 'Attendance updated', 201);
});
