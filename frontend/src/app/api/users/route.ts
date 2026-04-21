import { NextRequest } from "next/server";

import {
  bodyInitFromRequest,
  proxyToBackend,
} from "@/app/api/_utils/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/users/");
}

export async function POST(req: NextRequest) {
  const { body, contentType } = await bodyInitFromRequest(req);
  return proxyToBackend("/api/users/", {
    method: "POST",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body,
  });
}
