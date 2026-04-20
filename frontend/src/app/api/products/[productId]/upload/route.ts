import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

/** Aligned with ProductForm client validation. */
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id < 1) {
    return Response.json({ detail: "ID inválido." }, { status: 400 });
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json(
      { detail: "Selecione um arquivo de imagem." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { detail: "Arquivo muito grande (máx. 10 MB)." },
      { status: 400 },
    );
  }

  const outbound = new FormData();
  outbound.append("file", file);

  const res = await fetchBackendAuthenticated(`/api/products/${id}/upload`, {
    method: "POST",
    body: outbound,
  });

  if (res === null) {
    return Response.json(
      { detail: "Não autenticado. Entre novamente." },
      { status: 401 },
    );
  }

  const text = await res.text();
  if (res.ok) {
    revalidatePath("/products");
    revalidatePath(`/products/${id}/edit`);
  }

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
