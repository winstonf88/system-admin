import { describe, expect, it, vi, beforeEach } from "vitest";

import { AUTH_BASIC_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth-session";

function createCookieStore(initial?: Record<string, string>) {
  const jar = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    get(name: string) {
      const v = jar.get(name);
      return v !== undefined ? { name, value: v } : undefined;
    },
    jar,
  };
}

const cookieStoreRef = { current: createCookieStore() };

vi.mock("next/headers", () => ({
  cookies: async () => cookieStoreRef.current,
}));

vi.mock("@/lib/server-api", () => ({
  getBackendBaseUrl: () => "http://api.test",
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    cookieStoreRef.current = createCookieStore();
  });

  it("returns 401 without session cookie", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when basic cookie is missing", async () => {
    cookieStoreRef.current = createCookieStore({ [AUTH_SESSION_COOKIE]: "1" });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("proxies backend response when cookies are present", async () => {
    cookieStoreRef.current = createCookieStore({
      [AUTH_SESSION_COOKIE]: "1",
      [AUTH_BASIC_COOKIE]: "abc123",
    });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 2, email: "x@y.co" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: 2, email: "x@y.co" });
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://api.test/api/auth/session",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Basic abc123" }),
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});
