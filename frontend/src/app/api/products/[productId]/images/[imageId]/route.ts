import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string; imageId: string }> },
) {
  const { productId: rawPid, imageId: rawIid } = await ctx.params;
  const productId = Number(rawPid);
  const imageId = Number(rawIid);
  if (!Number.isFinite(productId) || productId < 1) {
    return Response.json({ detail: "ID de produto inválido." }, { status: 400 });
  }
  if (!Number.isFinite(imageId) || imageId < 1) {
    return Response.json({ detail: "ID de imagem inválido." }, { status: 400 });
  }

  const res = await fetchBackendAuthenticated(`/api/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });

  if (res === null) {
    return Response.json({ detail: "Não autenticado. Entre novamente." }, { status: 401 });
  }

  if (res.ok) {
    revalidatePath("/products");
    revalidatePath(`/products/${productId}/edit`);
  }

  return new Response(null, { status: res.status });
}
