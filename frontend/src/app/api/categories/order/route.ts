import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

export async function PUT(req: NextRequest) {
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend("/api/categories/order", {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
