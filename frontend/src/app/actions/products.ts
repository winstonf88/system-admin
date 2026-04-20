"use server";

import { revalidatePath } from "next/cache";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export type ProductActionResult = { ok: true } | { ok: false; error: string };

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

export type VariationPayload = {
  size: string | null;
  color: string | null;
  quantity: number;
};

export type CreateProductResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

export async function createProductAction(input: {
  name: string;
  description: string | null;
  category_ids: number[];
  variations: VariationPayload[];
}): Promise<CreateProductResult> {
  const res = await fetchBackendAuthenticated("/api/products/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category_ids: input.category_ids,
      variations: input.variations.map((v) => ({
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        quantity: v.quantity,
      })),
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  const data = (await res.json()) as { id: number };
  revalidatePath("/products");
  return { ok: true, id: data.id };
}

export async function updateProductAction(
  productId: number,
  input: {
    name: string;
    description: string | null;
    category_ids: number[];
    variations: VariationPayload[];
  },
): Promise<ProductActionResult> {
  const res = await fetchBackendAuthenticated(`/api/products/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category_ids: input.category_ids,
      variations: input.variations.map((v) => ({
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        quantity: v.quantity,
      })),
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteProductImageAction(
  productId: number,
  imageId: number,
): Promise<ProductActionResult> {
  const res = await fetchBackendAuthenticated(
    `/api/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
    },
  );
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products");
  revalidatePath(`/products/${productId}/edit`);
  return { ok: true };
}

export async function reorderProductImagesAction(
  productId: number,
  imageIds: number[],
): Promise<ProductActionResult> {
  const res = await fetchBackendAuthenticated(
    `/api/products/${productId}/images/order`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_ids: imageIds }),
    },
  );
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products");
  revalidatePath(`/products/${productId}/edit`);
  return { ok: true };
}

export async function deleteProductAction(
  productId: number,
): Promise<ProductActionResult> {
  const res = await fetchBackendAuthenticated(`/api/products/${productId}`, {
    method: "DELETE",
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/products");
  return { ok: true };
}
