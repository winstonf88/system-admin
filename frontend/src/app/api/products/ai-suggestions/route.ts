import { proxyToBackend } from "@/app/api/_utils/backend-proxy";

export async function POST(req: Request) {
  const formData = await req.formData();
  return proxyToBackend("/api/products/ai-suggestions", {
    method: "POST",
    body: formData,
  });
}
