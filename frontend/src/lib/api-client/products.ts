import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { apiRequest, type ApiResult } from "@/lib/api-client/core";

export type VariationPayload = {
  size: string | null;
  color: string | null;
  quantity: number;
};

type CreateProductPayload = {
  name: string;
  description: string | null;
  category_ids: number[];
  variations: VariationPayload[];
};

type UpdateProductPayload = CreateProductPayload;

export type ProductActionResult = { ok: true } | { ok: false; error: string };
export type CreateProductResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

function asActionResult<T>(result: ApiResult<T>): ProductActionResult {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function getProducts(input: {
  name?: string;
  categoryId?: number | null;
}): Promise<ApiResult<ProductRow[]>> {
  const params = new URLSearchParams();
  if (input.name?.trim()) {
    params.set("name", input.name.trim());
  }
  if (input.categoryId != null) {
    params.set("category_id", String(input.categoryId));
  }
  const query = params.toString();
  return apiRequest<ProductRow[]>(`/api/products${query ? `?${query}` : ""}`);
}

export async function getProduct(productId: number): Promise<ApiResult<ProductRow>> {
  return apiRequest<ProductRow>(`/api/products/${productId}`);
}

export async function getProductCategories(): Promise<ApiResult<CategoryOption[]>> {
  return apiRequest<CategoryOption[]>("/api/categories");
}

export async function createProduct(
  input: CreateProductPayload,
): Promise<CreateProductResult> {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category_ids: input.category_ids,
    variations: input.variations.map((variation) => ({
      size: variation.size?.trim() || null,
      color: variation.color?.trim() || null,
      quantity: variation.quantity,
    })),
  };
  const result = await apiRequest<ProductRow>("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, id: result.data.id };
}

export async function updateProduct(
  productId: number,
  input: UpdateProductPayload,
): Promise<ProductActionResult> {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    category_ids: input.category_ids,
    variations: input.variations.map((variation) => ({
      size: variation.size?.trim() || null,
      color: variation.color?.trim() || null,
      quantity: variation.quantity,
    })),
  };
  return asActionResult(
    await apiRequest<ProductRow>(`/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteProduct(
  productId: number,
): Promise<ProductActionResult> {
  return asActionResult(
    await apiRequest<void>(`/api/products/${productId}`, {
      method: "DELETE",
    }),
  );
}

export async function deleteProductImage(
  productId: number,
  imageId: number,
): Promise<ProductActionResult> {
  return asActionResult(
    await apiRequest<void>(`/api/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    }),
  );
}

export async function reorderProductImages(
  productId: number,
  imageIds: number[],
): Promise<ProductActionResult> {
  return asActionResult(
    await apiRequest<ProductRow>(`/api/products/${productId}/images/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_ids: imageIds }),
    }),
  );
}
