import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { AUTH_SESSION_COOKIE } from "@/lib/auth-session";
import { proxy } from "../proxy";

function request(path: string, cookieHeader?: string) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }
  return new NextRequest(url, { headers });
}

describe("proxy", () => {
  it("redirects unauthenticated users away from protected routes", () => {
    const res = proxy(request("/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/signin?from=%2Fusers",
    );
  });

  it("allows public auth pages without session", () => {
    const res = proxy(request("/signin"));
    expect(res.status).toBe(200);
  });

  it("redirects signed-in users away from signin", () => {
    const res = proxy(request("/signin", `${AUTH_SESSION_COOKIE}=1`));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/products");
  });

  it("allows authenticated access to admin routes", () => {
    const res = proxy(request("/users", `${AUTH_SESSION_COOKIE}=1`));
    expect(res.status).toBe(200);
  });
});
