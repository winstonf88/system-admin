import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  invalidIdResponse,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id < 1) {
    return invalidIdResponse("ID de produto inválido.");
  }
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend(`/api/products/${id}/images/order`, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
