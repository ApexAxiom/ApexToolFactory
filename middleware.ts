import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Redirects unauthenticated users to the login page while allowing auth endpoints.
 * @param req - Incoming Next.js middleware request.
 * @returns Redirect response or continuation.
 * @example
 * ```ts
 * import { middleware as authMiddleware } from "./middleware";
 * export function middleware(req: NextRequest) {
 *   return authMiddleware(req);
 * }
 * ```
 */
export function middleware(req: NextRequest) {
  const isLoginRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/api/login");
  const cookie = req.cookies.get("aa.sid");
  if (!cookie && !isLoginRoute) {
    const url = req.nextUrl.clone(); url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
