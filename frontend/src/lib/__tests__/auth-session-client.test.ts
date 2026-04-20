import {
  fetchAuthSession,
  resetAuthSessionClientForTests,
} from "@/lib/auth-session-client";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sessionPayload = {
  id: 1,
  email: "u@test.co",
  first_name: "U",
  last_name: "Ser",
  is_active: true,
  tenant_name: "Org",
};

describe("fetchAuthSession", () => {
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

  it("returns parsed session when response is ok", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(sessionPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchAuthSession()).resolves.toEqual(sessionPayload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/session", {
      credentials: "include",
    });
  });

  it("returns null when response is not ok", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(fetchAuthSession()).resolves.toBeNull();
  });

  it("returns null when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("network"));

    await expect(fetchAuthSession()).resolves.toBeNull();
  });

  it("dedupes concurrent calls into a single fetch", async () => {
    let resolve!: (value: Response) => void;
    const deferred = new Promise<Response>((r) => {
      resolve = r;
    });
    fetchSpy.mockImplementation(() => deferred);

    const a = fetchAuthSession();
    const b = fetchAuthSession();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    resolve(
      new Response(JSON.stringify(sessionPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const [one, two] = await Promise.all([a, b]);
    expect(one).toEqual(sessionPayload);
    expect(two).toEqual(sessionPayload);
  });

  it("allows a new fetch after the previous in-flight request completes", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(sessionPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchAuthSession();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await fetchAuthSession();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
