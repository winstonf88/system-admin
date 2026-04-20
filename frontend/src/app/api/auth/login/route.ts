import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AUTH_BASIC_COOKIE,
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session";
import { getBackendBaseUrl } from "@/lib/server-api";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Corpo JSON inválido." },
      { status: 400 },
    );
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  if (!email || !password) {
    return NextResponse.json(
      { detail: "E-mail e senha são obrigatórios." },
      { status: 400 },
    );
  }

  const basic = Buffer.from(`${email}:${password}`).toString("base64");
  const res = await fetch(`${getBackendBaseUrl()}/api/auth/session`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    return NextResponse.json(
      { detail: "E-mail ou senha inválidos." },
      { status: 401 },
    );
  }
  if (res.status === 403) {
    return NextResponse.json(
      { detail: "Esta conta está desativada." },
      { status: 403 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { detail: "Falha ao entrar. Tente novamente mais tarde." },
      { status: 502 },
    );
  }

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
  };
  cookieStore.set(AUTH_SESSION_COOKIE, "1", cookieOpts);
  cookieStore.set(AUTH_BASIC_COOKIE, basic, cookieOpts);

  return NextResponse.json({ ok: true });
}
