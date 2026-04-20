function parseUploadError(responseText: string, status: number): string {
  try {
    const j = JSON.parse(responseText) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return d;
    }
    if (Array.isArray(d)) {
      return d
        .map((item) =>
          typeof item === "object" && item !== null && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : String(item),
        )
        .join(", ");
    }
  } catch {
    // ignore
  }
  return `Falha na solicitação (${status})`;
}

/**
 * POST multipart file to the Next.js upload route (proxies to FastAPI).
 * Uses XMLHttpRequest so upload progress can be reported.
 */
export function uploadProductImageWithProgress(
  productId: number,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/products/${productId}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      const text = xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true });
        return;
      }
      resolve({ ok: false, error: parseUploadError(text, xhr.status) });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Erro de rede." });
    xhr.onabort = () => resolve({ ok: false, error: "Envio cancelado." });
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}
