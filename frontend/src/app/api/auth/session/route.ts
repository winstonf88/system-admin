import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_BASIC_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth-session";
import { getBackendBaseUrl } from "@/lib/server-api";

/**
 * Returns the current user from the FastAPI backend (for client components).
 * Uses the same HttpOnly cookies as server-side API calls.
 */
export async function GET() {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_SESSION_COOKIE)?.value) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }
  const basic = cookieStore.get(AUTH_BASIC_COOKIE)?.value;
  if (!basic) {
    return NextResponse.json(
      { detail: "Sign out and sign in again to refresh your session." },
      { status: 401 },
    );
  }

  const res = await fetch(`${getBackendBaseUrl()}/api/auth/session`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });

  const contentType = res.headers.get("Content-Type") ?? "application/json";
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": contentType },
  });
}
