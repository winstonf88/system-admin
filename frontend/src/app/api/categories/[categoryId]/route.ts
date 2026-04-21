import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  invalidIdResponse,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

function parseCategoryId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isFinite(id) && id >= 1 ? id : null;
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId: rawId } = await ctx.params;
  const id = parseCategoryId(rawId);
  if (id === null) {
    return invalidIdResponse("ID de categoria inválido.");
  }
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend(`/api/categories/${id}`, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId: rawId } = await ctx.params;
  const id = parseCategoryId(rawId);
  if (id === null) {
    return invalidIdResponse("ID de categoria inválido.");
  }
  return proxyToBackend(`/api/categories/${id}`, { method: "DELETE" });
}
