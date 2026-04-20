import { describe, expect, it, vi, beforeEach } from "vitest";

import { AUTH_BASIC_COOKIE, AUTH_SESSION_COOKIE } from "@/lib/auth-session";

function createCookieStore(initial?: Record<string, string>) {
  const jar = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    get(name: string) {
      const v = jar.get(name);
      return v !== undefined ? { name, value: v } : undefined;
    },
    set(name: string, value: string) {
      jar.set(name, value);
    },
    delete(name: string) {
      jar.delete(name);
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

import { POST } from "../route";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    cookieStoreRef.current = createCookieStore();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when email or password missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: " ", password: "" }),
      }),
    );
    expect(res.status).toBe(400);
    const j = (await res.json()) as { detail?: string };
    expect(j.detail).toContain("obrigatórios");
  });

  it("returns 401 when backend rejects credentials", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 401 }));
    try {
      const res = await POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "a@b.co", password: "secret" }),
        }),
      );
      expect(res.status).toBe(401);
      expect(cookieStoreRef.current.jar.size).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it("sets session cookies when backend accepts credentials", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1, email: "a@b.co" }), {
        status: 200,
      }),
    );
    try {
      const res = await POST(
        new Request("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "a@b.co", password: "secret" }),
        }),
      );
      expect(res.status).toBe(200);
      expect(cookieStoreRef.current.jar.get(AUTH_SESSION_COOKIE)).toBe("1");
      const basic = cookieStoreRef.current.jar.get(AUTH_BASIC_COOKIE);
      expect(basic).toBe(Buffer.from("a@b.co:secret").toString("base64"));

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://api.test/api/auth/session",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${basic}`,
          }),
        }),
      );
    } finally {
      spy.mockRestore();
    }
  });
});
