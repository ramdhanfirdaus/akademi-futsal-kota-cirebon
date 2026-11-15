import { STAFF, ok, route } from '@/server/http';
import { allActiveCoaches } from '@/server/services/coaches';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await allActiveCoaches(db), 'Coaches retrieved successfully'));
