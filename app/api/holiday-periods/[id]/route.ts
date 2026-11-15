import { STAFF, idParam, ok, route } from '@/server/http';
import { deleteHoliday } from '@/server/services/holidays';

export const DELETE = route<{ id: string }>({ roles: STAFF }, async ({ db, params }) => {
  await deleteHoliday(db, idParam(params.id));
  return ok(null, 'Holiday period deleted successfully');
});
