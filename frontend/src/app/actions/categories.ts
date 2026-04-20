"use server";

import { revalidatePath } from "next/cache";

import type { CategoryOption } from "@/components/products/product-types";
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
  return { ok: true, category };
}
