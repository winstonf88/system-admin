import {
  AuthSessionProvider,
  useAuthSession,
} from "@/context/AuthSessionContext";
import { AUTH_SESSION_REFRESH_EVENT } from "@/lib/auth-session";
import { resetAuthSessionClientForTests } from "@/lib/auth-session-client";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const sessionA = {
  id: 1,
  email: "a@test.co",
  first_name: "A",
  last_name: "One",
  is_active: true,
  tenant_name: "Org A",
};

const sessionB = {
  ...sessionA,
  email: "b@test.co",
  tenant_name: "Org B",
};

function SessionEmail() {
  const { session, sessionLoaded } = useAuthSession();
  if (!sessionLoaded) {
    return <span>loading</span>;
  }
  return <span>{session?.email ?? "none"}</span>;
}

function ThrowsWithoutProvider() {
  useAuthSession();
  return null;
}

describe("AuthSessionProvider", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeAll(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  afterEach(() => {
    fetchSpy.mockReset();
    resetAuthSessionClientForTests();
  });

  it("loads session on mount", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(sessionA), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(
      <AuthSessionProvider>
        <SessionEmail />
      </AuthSessionProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("a@test.co")).toBeInTheDocument();
    });

    expect(
      fetchSpy.mock.calls.filter((c) =>
        String(c[0]).includes("/api/auth/session"),
      ),
    ).toHaveLength(1);
  });

  it("refetches when AUTH_SESSION_REFRESH_EVENT fires", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sessionA), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sessionB), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    render(
      <AuthSessionProvider>
        <SessionEmail />
      </AuthSessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("a@test.co")).toBeInTheDocument();
    });

    window.dispatchEvent(new Event(AUTH_SESSION_REFRESH_EVENT));

    await waitFor(() => {
      expect(screen.getByText("b@test.co")).toBeInTheDocument();
    });

    expect(
      fetchSpy.mock.calls.filter((c) =>
        String(c[0]).includes("/api/auth/session"),
      ),
    ).toHaveLength(2);
  });

  it("useAuthSession throws outside AuthSessionProvider", () => {
    expect(() => render(<ThrowsWithoutProvider />)).toThrow(
      "useAuthSession must be used within AuthSessionProvider",
    );
  });
});
