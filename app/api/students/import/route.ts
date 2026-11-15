import { STAFF, ok, readJson, route } from '@/server/http';
import { importStudents } from '@/server/services/studentImport';

/** Body: { rows: [...], dry_run?: boolean } — all or nothing; dry_run only validates. */
export const POST = route({ roles: STAFF }, async ({ req, db }) => {
  const res = await importStudents(db, await readJson(req));
  return ok(res, res.dry_run ? `${res.count} baris siap diimpor` : `${res.count} siswa ditambahkan`, res.dry_run ? 200 : 201);
});
