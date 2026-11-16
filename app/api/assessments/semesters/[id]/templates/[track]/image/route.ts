import { STAFF, idParam, ok, readJson, route } from '@/server/http';
import { notFound } from '@/server/errors';
import { getTemplate, getTemplateMeta, saveTemplateImage } from '@/server/services/assessments/templates';
import { trackSchema } from '@/server/services/assessments/semesters';

type P = { id: string; track: string };

/** URLs carry ?v=<updated_at>, so the bytes can be cached for a long time. */
export const GET = route<P>({ roles: STAFF }, async ({ db, params }) => {
  const track = trackSchema.safeParse(params.track);
  if (!track.success) throw notFound();
  const t = await getTemplate(db, idParam(params.id), track.data);
  if (!t) throw notFound();
  return new Response(Buffer.from(t.image), {
    headers: { 'Content-Type': t.image_type, 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
});

export const PUT = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) => {
  const id = idParam(params.id);
  await saveTemplateImage(db, id, params.track, await readJson(req));
  return ok(await getTemplateMeta(db, id, params.track), 'Template diunggah');
});
