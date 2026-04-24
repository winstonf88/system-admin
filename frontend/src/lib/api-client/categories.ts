import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import type { CategoryTreeNode } from "@/app/(admin)/categories/components/CategoriesManager/types";
import { apiRequest, type ApiResult } from "@/lib/api-client/core";

export type CategoryActionResult = { ok: true } | { ok: false; error: string };
export type CreateCategoryResult =
  | { ok: true; category: CategoryOption }
  | { ok: false; error: string };

function asActionError(result: ApiResult<unknown>): CategoryActionResult {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function getCategories(): Promise<ApiResult<CategoryOption[]>> {
  return apiRequest<CategoryOption[]>("/api/categories");
}

export async function getCategoriesTree(): Promise<
  ApiResult<CategoryTreeNode[]>
> {
  return apiRequest<CategoryTreeNode[]>("/api/categories/tree");
}

export async function createCategory(input: {
  name: string;
  parent_id: number | null;
}): Promise<CreateCategoryResult> {
  const result = await apiRequest<CategoryOption>("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, category: result.data };
}

export async function updateCategory(
  categoryId: number,
  input: {
    name?: string;
    parent_id?: number | null;
  },
): Promise<CreateCategoryResult> {
  const result = await apiRequest<CategoryOption>(
    `/api/categories/${categoryId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, category: result.data };
}

export async function toggleCategoryActive(
  categoryId: number,
  is_active: boolean,
): Promise<CategoryActionResult> {
  return asActionError(
    await apiRequest<unknown>(`/api/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    }),
  );
}

export async function deleteCategory(
  categoryId: number,
): Promise<CategoryActionResult> {
  return asActionError(
    await apiRequest<void>(`/api/categories/${categoryId}`, {
      method: "DELETE",
    }),
  );
}

export async function moveCategory(
  categoryId: number,
  parentId: number | null,
): Promise<CategoryActionResult> {
  return asActionError(
    await apiRequest<CategoryOption>(`/api/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parent_id: parentId }),
    }),
  );
}

export async function reorderCategorySiblings(input: {
  parent_id: number | null;
  ordered_ids: number[];
}): Promise<CategoryActionResult> {
  return asActionError(
    await apiRequest<CategoryOption[]>("/api/categories/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
