import { NextRequest } from "next/server";

import { bodyInitFromRequest, proxyToBackend } from "@/app/api/_utils/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/tenant/");
}

export async function PATCH(req: NextRequest) {
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend("/api/tenant/", {
    method: "PATCH",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
