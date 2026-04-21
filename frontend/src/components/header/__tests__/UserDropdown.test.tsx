import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import UserDropdown from "../UserDropdown";

vi.mock("@/components/users/UserEditModal", () => ({
  default: () => null,
}));

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("UserDropdown", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn<typeof globalThis, "fetch">>;

  beforeAll(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    fetchSpy.mockReset();
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      if (url.includes("api/auth/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 1,
              email: "jane@test.co",
              first_name: "Jane",
              last_name: "Doe",
              is_active: true,
              tenant_name: "Acme Co",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.includes("api/auth/logout")) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
  });

  it("loads session and signs out via API + navigation", async () => {
    const user = userEvent.setup();
    render(
      <AuthSessionProvider>
        <UserDropdown />
      </AuthSessionProvider>,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/signin");
    });
    expect(refresh).toHaveBeenCalled();
    expect(
      fetchSpy.mock.calls.some(
        (call) =>
          String(call[0]).includes("api/auth/logout") &&
          (call[1] as RequestInit | undefined)?.method === "POST",
      ),
    ).toBe(true);
  });
});
