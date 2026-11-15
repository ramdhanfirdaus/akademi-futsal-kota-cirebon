import { jwtVerify } from 'jose';

/** Session token helpers that are safe to use from `proxy.ts` (no database, no Node-only modules). */

export type Role = 'ADMIN' | 'COACH' | 'STUDENT';

export const SESSION_COOKIE = 'afkc_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const ROLES: Role[] = ['ADMIN', 'COACH', 'STUDENT'];
export const MIN_SECRET_LENGTH = 32;

/** HS256 is only as strong as its key: refuse missing or short secrets instead of signing with them. */
export function requireSecret(secret: string | undefined): string {
  if (!secret) throw new Error('JWT_SECRET is not set');
  if (secret.length < MIN_SECRET_LENGTH) throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  return secret;
}

export async function verifySessionToken(
  token: string,
  secret: string | undefined,
): Promise<{ userId: number; role: Role; sessionVersion: number } | null> {
  const key = new TextEncoder().encode(requireSecret(secret));
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const userId = Number(payload.sub);
    const role = payload.role as Role;
    const sessionVersion = payload.ver === undefined ? 0 : Number(payload.ver);
    if (!Number.isInteger(userId) || !ROLES.includes(role) || !Number.isInteger(sessionVersion)) return null;
    return { userId, role, sessionVersion };
  } catch {
    return null;
  }
}
