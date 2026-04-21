import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  invalidIdResponse,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

function parseUserId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isFinite(id) && id >= 1 ? id : null;
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId: rawId } = await ctx.params;
  const userId = parseUserId(rawId);
  if (userId === null) {
    return invalidIdResponse("ID de usuário inválido.");
  }
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend(`/api/users/${userId}`, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const { userId: rawId } = await ctx.params;
  const userId = parseUserId(rawId);
  if (userId === null) {
    return invalidIdResponse("ID de usuário inválido.");
  }
  return proxyToBackend(`/api/users/${userId}`, { method: "DELETE" });
}
