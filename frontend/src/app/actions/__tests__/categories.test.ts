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
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  reorderCategorySiblingsAction,
  updateCategoryAction,
} from "../categories";

describe("category server actions", () => {
  beforeEach(() => {
    mockFetchBackend.mockReset();
    mockRevalidatePath.mockReset();
  });

  it("createCategoryAction revalidates products layout and categories page", async () => {
    mockFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: "X", parent_id: null }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const r = await createCategoryAction({ name: "  X  ", parent_id: null });
    expect(r).toMatchObject({ ok: true, category: { id: 1, name: "X", parent_id: null } });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products", "layout");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories", "page");
  });

  it("updateCategoryAction sends trimmed name and parent_id", async () => {
    mockFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ id: 2, name: "Y", parent_id: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await updateCategoryAction(2, { name: "  Y  ", parent_id: 1 });
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/categories/2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "Y", parent_id: 1 }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/products", "layout");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories", "page");
  });

  it("updateCategoryAction omits parent_id when not provided", async () => {
    mockFetchBackend.mockResolvedValue(
      new Response(JSON.stringify({ id: 3, name: "Only", parent_id: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await updateCategoryAction(3, { name: "Only" });
    const body = JSON.parse(
      (mockFetchBackend.mock.calls[0][1] as RequestInit).body as string,
    ) as Record<string, unknown>;
    expect(body).toEqual({ name: "Only" });
  });

  it("deleteCategoryAction calls DELETE and revalidates", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 204 }));
    const r = await deleteCategoryAction(4);
    expect(r).toEqual({ ok: true });
    expect(mockFetchBackend).toHaveBeenCalledWith("/api/categories/4", { method: "DELETE" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/categories", "page");
  });

  it("moveCategoryAction sends only parent_id", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 200 }));
    const r = await moveCategoryAction(5, null);
    expect(r).toEqual({ ok: true });
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/categories/5",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ parent_id: null }),
      }),
    );
  });

  it("reorderCategorySiblingsAction PUTs order payload", async () => {
    mockFetchBackend.mockResolvedValue(new Response(null, { status: 200 }));
    const r = await reorderCategorySiblingsAction({
      parent_id: null,
      ordered_ids: [3, 1, 2],
    });
    expect(r).toEqual({ ok: true });
    expect(mockFetchBackend).toHaveBeenCalledWith(
      "/api/categories/order",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ parent_id: null, ordered_ids: [3, 1, 2] }),
      }),
    );
  });

  it("returns unauthenticated error without revalidating", async () => {
    mockFetchBackend.mockResolvedValue(null);
    const r = await deleteCategoryAction(1);
    expect(r).toEqual({ ok: false, error: "Não autenticado. Entre novamente." });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
