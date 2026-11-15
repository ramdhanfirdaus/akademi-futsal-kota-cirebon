import { ok, route } from '@/server/http';
import { studentDashboard } from '@/server/services/dashboard';
import { todayWIB } from '@/lib/date';

export const GET = route({ roles: ['STUDENT'] }, async ({ db, actor }) => ok(await studentDashboard(db, actor!, todayWIB()), 'Data retrieved'));
