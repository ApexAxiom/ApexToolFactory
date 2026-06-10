import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/config/env";

const secret = new TextEncoder().encode(env.SESSION_SECRET);

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("pestimator.session")?.value;

  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // Expired or tampered token falls through to the login redirect.
    }
  }

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl);
  if (token) {
    response.cookies.delete("pestimator.session");
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*"]
};
