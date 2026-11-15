import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

/** UX-only redirects. Real authorization happens in every API route handler. */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token, process.env.JWT_SECRET).catch(() => null) : null;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/app') && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/app/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/login'] };
