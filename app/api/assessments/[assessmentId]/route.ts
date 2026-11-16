import { idParam, ok, route } from '@/server/http';
import { deleteAssessment } from '@/server/services/assessments/grades';

type P = { assessmentId: string };

export const DELETE = route<P>({ roles: ['ADMIN'] }, async ({ db, params }) => {
  await deleteAssessment(db, idParam(params.assessmentId));
  return ok(null, 'Penilaian dihapus');
});
