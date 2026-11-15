import { STAFF, ok, query, route } from '@/server/http';
import { participantStats } from '@/server/services/participants';
import { todayWIB } from '@/lib/date';

export const GET = route({ roles: STAFF }, async ({ req, db }) => ok(await participantStats(db, todayWIB(), query(req)), 'Data retrieved'));
