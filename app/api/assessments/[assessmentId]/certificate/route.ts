import { EVERYONE, idParam, route } from '@/server/http';
import { certificateInput } from '@/server/services/assessments/certificates';
import { buildCertificatePdf } from '@/lib/certificate';

type P = { assessmentId: string };

/** Built on request from the template and grades; students only get their own published one (else 404). */
export const GET = route<P>({ roles: EVERYONE }, async ({ db, actor, params }) => {
  const { fileName, ...input } = await certificateInput(db, actor!, idParam(params.assessmentId));
  const pdf = await buildCertificatePdf(input);
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
