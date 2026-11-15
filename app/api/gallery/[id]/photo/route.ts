import { idParam, route } from '@/server/http';
import { getGalleryPhoto } from '@/server/services/gallery';

type P = { id: string };

/** Public: shown on the landing page. URLs carry ?v=<updated_at>, so they can be cached long. */
export const GET = route<P>({}, async ({ db, params }) => {
  const { type, bytes } = await getGalleryPhoto(db, idParam(params.id));
  return new Response(Buffer.from(bytes), {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
});
