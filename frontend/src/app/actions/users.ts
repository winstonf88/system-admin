"use server";

import { revalidatePath } from "next/cache";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export type UserActionResult = { ok: true } | { ok: false; error: string };

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

export async function createUserAction(input: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}): Promise<UserActionResult> {
  const res = await fetchBackendAuthenticated("/api/users/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      first_name: input.first_name.trim() || null,
      last_name: input.last_name.trim() || null,
      is_active: input.is_active,
    }),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function updateUserAction(
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
  const res = await fetchBackendAuthenticated(`/api/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/users");
  return { ok: true };
}

export async function deleteUserAction(userId: number): Promise<UserActionResult> {
  const res = await fetchBackendAuthenticated(`/api/users/${userId}`, {
    method: "DELETE",
  });
  if (res === null) {
    return { ok: false, error: "Não autenticado. Entre novamente." };
  }
  if (!res.ok) {
    return { ok: false, error: await errorMessage(res) };
  }
  revalidatePath("/users");
  return { ok: true };
}
