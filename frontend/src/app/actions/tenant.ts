"use server";

import { revalidatePath } from "next/cache";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export type TenantActionResult = { ok: true } | { ok: false; error: string };

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

export async function updateTenantAction(input: { name: string }): Promise<TenantActionResult> {
  const res = await fetchBackendAuthenticated("/api/tenant/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/settings/tenant");
  revalidatePath("/");
  return { ok: true };
}
