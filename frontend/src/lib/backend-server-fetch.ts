import { cookies } from "next/headers";

import { AUTH_BASIC_COOKIE } from "@/lib/auth-session";
import { getBackendBaseUrl } from "@/lib/server-api";

/**
 * Authenticated fetch to the FastAPI backend (server components / route handlers only).
 * Returns null when the Basic auth cookie is missing (e.g. legacy session).
 */
export async function fetchBackendAuthenticated(
  path: string,
  init?: RequestInit,
): Promise<Response | null> {
  const cookieStore = await cookies();
  const basic = cookieStore.get(AUTH_BASIC_COOKIE)?.value;
  if (!basic) {
    return null;
  }
  const url = `${getBackendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Basic ${basic}`,
    },
    cache: "no-store",
  });
}
