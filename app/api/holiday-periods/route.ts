import { STAFF, ok, readJson, route } from '@/server/http';
import { createHoliday, listHolidays } from '@/server/services/holidays';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await listHolidays(db), 'Holiday periods retrieved'));

export const POST = route({ roles: STAFF }, async ({ req, db }) =>
  ok(await createHoliday(db, await readJson(req)), 'Holiday period created successfully', 201),
);
