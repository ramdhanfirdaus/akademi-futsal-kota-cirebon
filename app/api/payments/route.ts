import { STAFF, ok, query, readJson, route } from '@/server/http';
import { getPaymentMatrix, savePayments } from '@/server/services/payments';

export const GET = route({ roles: STAFF }, async ({ req, db }) =>
  ok(await getPaymentMatrix(db, query(req)), 'Payments retrieved successfully'),
);

export const POST = route({ roles: STAFF }, async ({ req, db }) => {
  await savePayments(db, await readJson(req));
  return ok(null, 'Payments saved', 201);
});
