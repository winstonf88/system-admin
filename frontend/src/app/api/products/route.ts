import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url);
  return proxyToBackend(`/api/products/${search}`);
}

export async function POST(req: NextRequest) {
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend("/api/products/", {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
