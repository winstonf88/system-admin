import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_BASIC_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth-session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
  cookieStore.delete(AUTH_BASIC_COOKIE);
  return NextResponse.json({ ok: true });
}
