import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

const UNAUTHENTICATED_DETAIL = "Não autenticado. Entre novamente.";

export function jsonContentType(headers: Headers): string {
  return headers.get("Content-Type") ?? "application/json";
}

export function invalidIdResponse(detail: string): Response {
  return Response.json({ detail }, { status: 400 });
}

export async function proxyToBackend(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetchBackendAuthenticated(path, init);
  if (res === null) {
    return Response.json({ detail: UNAUTHENTICATED_DETAIL }, { status: 401 });
  }

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "Content-Type": jsonContentType(res.headers),
    },
  });
}

export async function bodyInitFromRequest(
  req: Request,
): Promise<{ body?: string; contentType?: string }> {
  const body = await req.text();
  if (!body) {
    return {};
  }
  return {
    body,
    contentType: req.headers.get("Content-Type") ?? "application/json",
  };
}
