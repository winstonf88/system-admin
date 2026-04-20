import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { AUTH_SESSION_COOKIE } from "@/lib/auth-session";
import { middleware } from "../middleware";

function request(path: string, cookieHeader?: string) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }
  return new NextRequest(url, { headers });
}

describe("middleware", () => {
  it("redirects unauthenticated users away from protected routes", () => {
    const res = middleware(request("/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/signin?from=%2Fusers");
  });

  it("allows public auth pages without session", () => {
    const res = middleware(request("/signin"));
    expect(res.status).toBe(200);
  });

  it("redirects signed-in users away from signin", () => {
    const res = middleware(
      request("/signin", `${AUTH_SESSION_COOKIE}=1`),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated access to admin routes", () => {
    const res = middleware(request("/users", `${AUTH_SESSION_COOKIE}=1`));
    expect(res.status).toBe(200);
  });
});
