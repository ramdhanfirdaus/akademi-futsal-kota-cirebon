import { revalidatePath } from 'next/cache';
import { idParam, ok, readJson, route } from '@/server/http';
import { deleteGalleryPhoto, updateGalleryPhoto } from '@/server/services/gallery';

type P = { id: string };

export const PATCH = route<P>({ roles: ['ADMIN'] }, async ({ req, db, params }) => {
  const item = await updateGalleryPhoto(db, idParam(params.id), await readJson(req));
  revalidatePath('/');
  return ok(item, 'Keterangan disimpan');
});

export const DELETE = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => {
  await deleteGalleryPhoto(db, idParam(params.id));
  revalidatePath('/');
  return ok(null, 'Foto dihapus');
});
