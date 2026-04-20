import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFetchBackend = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/backend-server-fetch", () => ({
  fetchBackendAuthenticated: (...args: unknown[]) => mockFetchBackend(...args),
}));

import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "../users";

describe("user server actions", () => {
  beforeEach(() => {
    mockFetchBackend.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("createUserAction posts trimmed fields and revalidates on success", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 201 }));
    const r = await createUserAction({
      email: "  u@test.co  ",
      password: "password123",
      first_name: " Ann ",
      last_name: " Lee ",
      is_active: true,
    });
    expect(r).toEqual({ ok: true });
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/users/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "u@test.co",
          password: "password123",
          first_name: "Ann",
          last_name: "Lee",
          is_active: true,
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users");
  });

  it("createUserAction returns error when unauthenticated", async () => {
    mockFetchBackend.mockResolvedValue(null);
    const r = await createUserAction({
      email: "a@b.co",
      password: "x",
      first_name: "",
      last_name: "",
      is_active: false,
    });
    expect(r).toEqual({ ok: false, error: "Não autenticado. Entre novamente." });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("updateUserAction omits password when blank", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 200 }));
    const r = await updateUserAction(5, {
      email: "e@test.co",
      first_name: "F",
      last_name: "L",
      is_active: false,
      password: "   ",
    });
    expect(r).toEqual({ ok: true });
    const body = JSON.parse(
      (mockFetchBackend.mock.calls[0][1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body).not.toHaveProperty("password");
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/users/5",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("updateUserAction includes password when provided", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 200 }));
    await updateUserAction(1, {
      email: "e@test.co",
      first_name: "",
      last_name: "",
      is_active: true,
      password: "newsecret1",
    });
    const body = JSON.parse(
      (mockFetchBackend.mock.calls[0][1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body.password).toBe("newsecret1");
  });

  it("deleteUserAction calls backend and revalidates", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 204 }));
    const r = await deleteUserAction(9);
    expect(r).toEqual({ ok: true });
    expect(mockFetchBackend).toHaveBeenCalledWith("/api/users/9", { method: "DELETE" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/users");
  });

  it("surfaces API error detail strings", async () => {
    mockFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ detail: "E-mail já existe." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const r = await createUserAction({
      email: "dup@test.co",
      password: "password123",
      first_name: "",
      last_name: "",
      is_active: true,
    });
    expect(r).toEqual({ ok: false, error: "E-mail já existe." });
  });
});
