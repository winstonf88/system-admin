import { apiRequest, type ApiResult } from "@/lib/api-client/core";

export type TenantSettings = {
  name: string;
  config?: {
    instagram_account?: string | null;
    whatsapp_number?: string | null;
  };
};

export type TenantActionResult = { ok: true } | { ok: false; error: string };

export async function getTenant(): Promise<ApiResult<TenantSettings>> {
  return apiRequest<TenantSettings>("/api/tenant");
}

export async function updateTenant(input: {
  name: string;
  config?: {
    instagram_account?: string | null;
    whatsapp_number?: string | null;
  };
}): Promise<TenantActionResult> {
  const result = await apiRequest<TenantSettings>("/api/tenant", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name.trim(),
      ...(input.config !== undefined && { config: input.config }),
    }),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
