import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { users } from './db/schema';
import type { Db } from './db';
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken, type Role } from '@/lib/session';

export { SESSION_COOKIE, SESSION_MAX_AGE, type Role };
export type Actor = { userId: number; role: Role; username: string };

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signSession(a: { userId: number; role: Role }): Promise<string> {
  return new SignJWT({ role: a.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(a.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export function verifySession(token: string) {
  return verifySessionToken(token, process.env.JWT_SECRET);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

/** Serialises the session cookie for a `Set-Cookie` header. Pass `null` to clear it. */
export function sessionCookieHeader(token: string | null): string {
  const o = sessionCookieOptions();
  const parts = [
    `${SESSION_COOKIE}=${token ?? ''}`,
    `Path=${o.path}`,
    `Max-Age=${token ? o.maxAge : 0}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (o.secure) parts.push('Secure');
  return parts.join('; ');
}

export function readSessionToken(req: Request): string | undefined {
  const header = req.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** Verifies the token AND reloads the user, so deactivated accounts lose access immediately. */
export async function loadActor(db: Db, token: string | undefined): Promise<Actor | null> {
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  const [u] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!u || u.status !== 'ACTIVE') return null;
  return { userId: u.id, role: u.role, username: u.username };
}
