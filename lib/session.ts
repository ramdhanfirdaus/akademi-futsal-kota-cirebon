import { jwtVerify } from 'jose';

/** Session token helpers that are safe to use from `proxy.ts` (no database, no Node-only modules). */

export type Role = 'ADMIN' | 'COACH' | 'STUDENT';

export const SESSION_COOKIE = 'afkc_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const ROLES: Role[] = ['ADMIN', 'COACH', 'STUDENT'];

export async function verifySessionToken(
  token: string,
  secret: string | undefined,
): Promise<{ userId: number; role: Role } | null> {
  if (!secret) throw new Error('JWT_SECRET is not set');
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    const role = payload.role as Role;
    if (!Number.isInteger(userId) || !ROLES.includes(role)) return null;
    return { userId, role };
  } catch {
    return null;
  }
}
