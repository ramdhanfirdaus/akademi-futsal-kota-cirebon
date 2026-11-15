import { revalidatePath } from 'next/cache';
import { ok, readJson, route } from '@/server/http';
import { addGalleryPhoto, listGallery } from '@/server/services/gallery';

export const GET = route({ roles: ['ADMIN'] }, async ({ db }) => ok(await listGallery(db), 'Data retrieved'));

/** Body: { photo: <image data URL>, caption?: string } */
export const POST = route({ roles: ['ADMIN'] }, async ({ req, db }) => {
  const item = await addGalleryPhoto(db, await readJson(req));
  revalidatePath('/'); // show it on the landing page right away
  return ok(item, 'Foto ditambahkan', 201);
});
