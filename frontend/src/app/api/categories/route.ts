import { NextRequest } from "next/server";

import { bodyInitFromRequest, proxyToBackend } from "@/app/api/_utils/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/categories/");
}

export async function POST(req: NextRequest) {
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend("/api/categories/", {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
