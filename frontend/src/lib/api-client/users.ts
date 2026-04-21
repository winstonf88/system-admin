import type { UserRow } from "@/components/users/user-types";
import { apiRequest, type ApiResult } from "@/lib/api-client/core";

export type UserActionResult = { ok: true } | { ok: false; error: string };

function toActionResult(result: ApiResult<unknown>): UserActionResult {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function getUsers(): Promise<ApiResult<UserRow[]>> {
  return apiRequest<UserRow[]>("/api/users");
}

export async function createUser(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}): Promise<UserActionResult> {
  return toActionResult(
    await apiRequest<UserRow>("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateUser(
  userId: number,
  input: {
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    password: string;
  },
): Promise<UserActionResult> {
  const body: Record<string, unknown> = {
    email: input.email.trim(),
    first_name: input.first_name.trim() || null,
    last_name: input.last_name.trim() || null,
    is_active: input.is_active,
  };
  if (input.password.trim().length > 0) {
    body.password = input.password;
  }
  return toActionResult(
    await apiRequest<UserRow>(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export async function deleteUser(userId: number): Promise<UserActionResult> {
  return toActionResult(
    await apiRequest<void>(`/api/users/${userId}`, {
      method: "DELETE",
    }),
  );
}
