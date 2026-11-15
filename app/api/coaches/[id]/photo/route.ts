import { idParam, route } from '@/server/http';
import { getCoachPhoto } from '@/server/services/coaches';

type P = { id: string };

/** Public: coach photos appear on the landing page. URLs carry ?v=<updated_at>, so they can be cached long. */
export const GET = route<P>({}, async ({ db, params }) => {
  const { type, bytes } = await getCoachPhoto(db, idParam(params.id));
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
