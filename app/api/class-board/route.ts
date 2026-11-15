import { STAFF, ok, readJson, route } from '@/server/http';
import { classBoard, moveStudents } from '@/server/services/classBoard';

export const GET = route({ roles: STAFF }, async ({ db }) => ok(await classBoard(db), 'Data retrieved'));

/** Body: { moves: [{ student_id, class_id }] } — all or nothing. */
export const PUT = route({ roles: STAFF }, async ({ req, db }) => {
  const res = await moveStudents(db, await readJson(req));
  return ok({ ...res, board: await classBoard(db) }, `${res.moved} siswa dipindahkan`);
});
