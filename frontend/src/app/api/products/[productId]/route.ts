import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  invalidIdResponse,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

function parseProductId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isFinite(id) && id >= 1 ? id : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await ctx.params;
  const id = parseProductId(rawId);
  if (id === null) {
    return invalidIdResponse("ID inválido.");
  }
  return proxyToBackend(`/api/products/${id}`);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await ctx.params;
  const id = parseProductId(rawId);
  if (id === null) {
    return invalidIdResponse("ID inválido.");
  }
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend(`/api/products/${id}`, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ productId: string }> },
) {
  const { productId: rawId } = await ctx.params;
  const id = parseProductId(rawId);
  if (id === null) {
    return invalidIdResponse("ID inválido.");
  }
  return proxyToBackend(`/api/products/${id}`, { method: "DELETE" });
}
