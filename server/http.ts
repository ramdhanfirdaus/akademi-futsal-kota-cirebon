import 'server-only';
import { ZodError } from 'zod';
import { AppError, notFound } from './errors';
import { getDb, type Db } from './db';
import { loadActor, readSessionToken, sessionCookieHeader, type Actor, type Role } from './auth';

type Meta = Record<string, unknown>;

export function ok(data: unknown, message = 'Success', status = 200, meta?: Meta): Response {
  const body: Record<string, unknown> = { status: 'success', message, data };
  if (meta) body.meta = meta;
  return Response.json(body, { status });
}

function errorBody(status: number, message: string, errors?: Record<string, string[]>): Response {
  const body: Record<string, unknown> = { status: 'error', message };
  if (errors) body.errors = errors;
  return Response.json(body, { status });
}

export function zodErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

/** Postgres error code, looking through Drizzle's wrapped `cause` chain. */
export function pgCode(err: unknown): string | undefined {
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === 'object'; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export function fail(err: unknown): Response {
  if (err instanceof AppError) return errorBody(err.status, err.message, err.errors);
  if (err instanceof ZodError) return errorBody(422, 'Validation failed', zodErrors(err));
  if (pgCode(err) === '23505') return errorBody(409, 'Data sudah ada');
  console.error(err);
  return errorBody(500, 'Internal Server Error');
}

export type RouteCtx<P> = { req: Request; db: Db; actor: Actor | null; params: P };

/** Wraps a route handler: loads the session, enforces roles, maps errors to the JSON envelope. */
export function route<P = Record<string, string>>(
  opts: { roles?: Role[] },
  handler: (ctx: RouteCtx<P>) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const db = getDb();
      const token = readSessionToken(req);
      const actor = await loadActor(db, token);
      if (opts.roles) {
        if (!actor) {
          const res = errorBody(401, 'Unauthenticated');
          // A stale/deactivated session would otherwise bounce between /login and /app via proxy.ts.
          if (token) res.headers.append('Set-Cookie', sessionCookieHeader(null));
          return res;
        }
        if (!opts.roles.includes(actor.role)) return errorBody(403, 'Forbidden');
      }
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler({ req, db, actor, params });
    } catch (err) {
      return fail(err);
    }
  };
}

/** Parses a JSON body; empty or malformed bodies become `{}` so validation reports missing fields. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function query(req: Request): Record<string, string> {
  return Object.fromEntries(new URL(req.url).searchParams.entries());
}

export function idParam(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}

export const STAFF: Role[] = ['ADMIN', 'COACH'];
export const EVERYONE: Role[] = ['ADMIN', 'COACH', 'STUDENT'];
