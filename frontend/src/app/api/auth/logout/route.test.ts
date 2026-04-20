import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUTH_BASIC_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth-session";

function createCookieStore(initial?: Record<string, string>) {
  const jar = new Map<string, string>(Object.entries(initial ?? {}));
  const deleted: string[] = [];
  return {
    get(name: string) {
      const v = jar.get(name);
      return v !== undefined ? { name, value: v } : undefined;
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
    delete(name: string) {
      deleted.push(name);
      jar.delete(name);
    },
    jar,
    deleted,
  };
}

const cookieStoreRef = { current: createCookieStore() };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStoreRef.current,
}));

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    cookieStoreRef.current = createCookieStore({
      [AUTH_SESSION_COOKIE]: "1",
      [AUTH_BASIC_COOKIE]: "xyz",
    });
  });

  it("clears auth cookies and returns ok", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()) as { ok?: boolean }).toEqual({ ok: true });
    expect(cookieStoreRef.current.deleted.sort()).toEqual(
      [AUTH_SESSION_COOKIE, AUTH_BASIC_COOKIE].sort(),
    );
    expect(cookieStoreRef.current.jar.size).toBe(0);
  });
});
