export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export async function parseApiError(res: Response): Promise<string> {
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
  } catch {
    // ignore and return fallback below
  }
  return `Falha na solicitação (${res.status})`;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    return { ok: false, error: await parseApiError(res), status: res.status };
  }
  if (res.status === 204) {
    return { ok: true, data: undefined as T, status: res.status };
  }
  return { ok: true, data: (await res.json()) as T, status: res.status };
}
