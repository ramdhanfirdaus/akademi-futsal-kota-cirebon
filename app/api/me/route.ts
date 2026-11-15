import { EVERYONE, ok, route } from '@/server/http';
import { me } from '@/server/services/auth';

export const GET = route({ roles: EVERYONE }, async ({ db, actor }) => ok(await me(db, actor!)));
