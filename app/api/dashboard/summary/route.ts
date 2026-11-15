import { STAFF, ok, route } from '@/server/http';
import { dashboardSummary } from '@/server/services/dashboard';
import { todayWIB } from '@/lib/date';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await dashboardSummary(db, todayWIB()), 'Data retrieved'));
