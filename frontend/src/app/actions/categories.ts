"use server";

import { revalidatePath } from "next/cache";

import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

async function errorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return d;
    }
    if (Array.isArray(d)) {
      return d
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join(", ");
    }
    return `Falha na solicitação (${res.status})`;
  } catch {
    return `Falha na solicitação (${res.status})`;
  }
}

export type CreateCategoryResult =
  | { ok: true; category: CategoryOption }
  | { ok: false; error: string };

export type CategoryActionResult = { ok: true } | { ok: false; error: string };

export async function createCategoryAction(input: {
  name: string;
  parent_id: number | null;
}): Promise<CreateCategoryResult> {
  const res = await fetchBackendAuthenticated("/api/categories/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      parent_id: input.parent_id,
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  const category = (await res.json()) as CategoryOption;
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "page");
  return { ok: true, category };
}

export async function updateCategoryAction(
  categoryId: number,
  input: {
    name?: string;
    parent_id?: number | null;
  },
): Promise<CreateCategoryResult> {
  const payload: { name?: string; parent_id?: number | null } = {};
  if (typeof input.name === "string") {
    payload.name = input.name.trim();
  }
  if ("parent_id" in input) {
    payload.parent_id = input.parent_id ?? null;
  }

  const res = await fetchBackendAuthenticated(`/api/categories/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  const category = (await res.json()) as CategoryOption;
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "page");
  return { ok: true, category };
}

export async function deleteCategoryAction(categoryId: number): Promise<CategoryActionResult> {
  const res = await fetchBackendAuthenticated(`/api/categories/${categoryId}`, {
    method: "DELETE",
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "page");
  return { ok: true };
}

export async function moveCategoryAction(
  categoryId: number,
  parentId: number | null,
): Promise<CategoryActionResult> {
  const res = await fetchBackendAuthenticated(`/api/categories/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent_id: parentId }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "page");
  return { ok: true };
}

export async function reorderCategorySiblingsAction(input: {
  parent_id: number | null;
  ordered_ids: number[];
}): Promise<CategoryActionResult> {
  const res = await fetchBackendAuthenticated("/api/categories/order", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parent_id: input.parent_id,
      ordered_ids: input.ordered_ids,
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "page");
  return { ok: true };
}
