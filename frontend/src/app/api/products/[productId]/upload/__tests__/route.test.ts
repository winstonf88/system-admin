import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockRevalidatePath = vi.fn();
const mockFetchBackend = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/backend-server-fetch", () => ({
  fetchBackendAuthenticated: (...args: unknown[]) => mockFetchBackend(...args),
}));

import { POST } from "../route";

describe("POST /api/products/[productId]/upload", () => {
  beforeEach(() => {
    mockRevalidatePath.mockReset();
    mockFetchBackend.mockReset();
  });

  it("returns 400 when product id is invalid", async () => {
    const req = { formData: async () => new FormData() } as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ productId: "abc" }) });

    expect(res.status).toBe(400);
    expect(mockFetchBackend).not.toHaveBeenCalled();
  });

  it("returns 400 when file is missing", async () => {
    const req = { formData: async () => new FormData() } as NextRequest;

    const res = await POST(req, { params: Promise.resolve({ productId: "1" }) });
    expect(res.status).toBe(400);
    expect((await res.json()) as { detail: string }).toEqual({
      detail: "Selecione um arquivo de imagem.",
    });
    expect(mockFetchBackend).not.toHaveBeenCalled();
  });

  it("returns 401 when backend auth is missing", async () => {
    const fd = new FormData();
    fd.append("file", new File(["abc"], "photo.png", { type: "image/png" }));
    mockFetchBackend.mockResolvedValue(null);

    const req = { formData: async () => fd } as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ productId: "10" }) });

    expect(res.status).toBe(401);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("proxies backend response and revalidates on success", async () => {
    const fd = new FormData();
    fd.append("file", new File(["abc"], "photo.png", { type: "image/png" }));
    mockFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ file_url: "/uploads/products/new.png" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const req = { formData: async () => fd } as NextRequest;
    const res = await POST(req, { params: Promise.resolve({ productId: "10" }) });

    expect(res.status).toBe(200);
    expect((await res.json()) as { file_url: string }).toEqual({
      file_url: "/uploads/products/new.png",
    });
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/products/10/upload",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products/10/edit");
  });
});
