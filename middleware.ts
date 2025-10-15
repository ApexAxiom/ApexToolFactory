import crypto from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Attaches a request identifier and security headers to every response.
 * @param req Incoming Next.js request.
 * @returns Next middleware response with headers applied.
 * @example
 * export { middleware } from './middleware';
 */
export function middleware(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:'",
  );
  return res;
}

export const config = {
  matcher: ['/((?!_next|api/healthz).*)'],
};
