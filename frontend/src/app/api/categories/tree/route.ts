import { proxyToBackend } from "@/app/api/_utils/backend-proxy";

export async function GET() {
  return proxyToBackend("/api/categories/tree");
}
