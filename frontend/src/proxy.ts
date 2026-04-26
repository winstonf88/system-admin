import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/lib/auth-session";

const PUBLIC_PATHS = new Set(["/signin", "/signup", "/reset-password"]);
const AUTHENTICATED_DEFAULT_PATH = "/products";

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = request.cookies.get(AUTH_SESSION_COOKIE)?.value;

  if (isPublicPath(pathname)) {
    if (session && (pathname === "/signin" || pathname === "/signup")) {
      return NextResponse.redirect(
        new URL(AUTHENTICATED_DEFAULT_PATH, request.url),
      );
    }
    return NextResponse.next();
  }

  if (!session) {
    const signIn = new URL("/signin", request.url);
    if (pathname !== "/") {
      signIn.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
