import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRevalidatePath = vi.fn();
const mockFetchBackend = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/backend-server-fetch", () => ({
  fetchBackendAuthenticated: (...args: unknown[]) => mockFetchBackend(...args),
}));

import { DELETE } from "../route";

describe("DELETE /api/products/[productId]/images/[imageId]", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockFetchBackend.mockReset();
  });

  it("returns 400 when product or image id is invalid", async () => {
    const res = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ productId: "x", imageId: "5" }),
    });
    expect(res.status).toBe(400);
    expect(mockFetchBackend).not.toHaveBeenCalled();
  });

  it("returns 401 when backend auth is missing", async () => {
    mockFetchBackend.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ productId: "10", imageId: "11" }),
    });
    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates product pages on success", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 204 }));

    const res = await DELETE(new Request("http://localhost") as never, {
      params: Promise.resolve({ productId: "10", imageId: "11" }),
    });

    expect(res.status).toBe(204);
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/products/10/images/11",
      {
        method: "DELETE",
      },
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products/10/edit");
  });
});
