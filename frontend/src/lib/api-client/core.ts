export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      error: string;
      status: number;
      fieldErrors?: Record<string, string>;
    };

type ValidationErrorItem = {
  loc?: unknown;
  msg?: unknown;
  type?: unknown;
};

function extractFieldFromLoc(loc: unknown): string | null {
  if (!Array.isArray(loc)) {
    return null;
  }
  const fieldParts = loc.filter((part) => typeof part === "string");
  const lastField = fieldParts.at(-1);
  return typeof lastField === "string" ? lastField : null;
}

function localizeValidationMessage(
  msg: string,
  field: string | null,
  type: string | null,
): string {
  if (field === "price" && type === "missing") {
    return "Informe o preço do produto.";
  }
  if (field === "name" && type === "missing") {
    return "Informe o nome do produto.";
  }
  if (field === "category_ids" && type === "missing") {
    return "Selecione pelo menos uma categoria.";
  }
  if (field === "price" && msg === "Input should be greater than 0") {
    return "O preço deve ser maior que zero.";
  }
  if (field === "name" && msg === "String should have at least 1 character") {
    return "Informe o nome do produto.";
  }
  if (
    field === "category_ids" &&
    msg.startsWith("List should have at least 1 item")
  ) {
    return "Selecione pelo menos uma categoria.";
  }
  if (msg === "Field required") {
    return "Campo obrigatório.";
  }
  return msg;
}

export async function parseApiError(res: Response): Promise<{
  message: string;
  fieldErrors?: Record<string, string>;
}> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return { message: d };
    }
    if (Array.isArray(d)) {
      const fieldErrors: Record<string, string> = {};
      const messages: string[] = [];
      for (const item of d) {
        if (typeof item === "object" && item !== null) {
          const details = item as ValidationErrorItem;
          const msg =
            typeof details.msg === "string" ? details.msg : String(details.msg);
          const type = typeof details.type === "string" ? details.type : null;
          const field = extractFieldFromLoc(details.loc);
          const localized = localizeValidationMessage(msg, field, type);
          messages.push(localized);
          if (field && !(field in fieldErrors)) {
            fieldErrors[field] = localized;
          }
          continue;
        }
        messages.push(String(item));
      }
      return {
        message: Array.from(new Set(messages)).join(", "),
        fieldErrors:
          Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      };
    }
  } catch {
    // ignore and return fallback below
  }
  return { message: `Falha na solicitação (${res.status})` };
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
    const parsed = await parseApiError(res);
    return {
      ok: false,
      error: parsed.message,
      status: res.status,
      fieldErrors: parsed.fieldErrors,
    };
  }
  if (res.status === 204) {
    return { ok: true, data: undefined as T, status: res.status };
  }
  return { ok: true, data: (await res.json()) as T, status: res.status };
}
