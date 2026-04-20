/** Base URL for the FastAPI backend (server-side only; omit trailing slash). */
export function getBackendBaseUrl(): string {
  const url =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://127.0.0.1:8000";
  return url.replace(/\/$/, "");
}
