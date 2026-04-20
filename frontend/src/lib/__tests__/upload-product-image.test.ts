import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadProductImageWithProgress } from "../upload-product-image";

type XhrUpload = {
  onprogress: ((e: ProgressEvent<EventTarget>) => void) | null;
};

class MockXhr {
  static instances: MockXhr[] = [];

  upload: XhrUpload = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  responseText = "";
  status = 0;

  method?: string;
  url?: string;
  sentBody: FormData | null = null;

  constructor() {
    MockXhr.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.sentBody = body;
  }
}

describe("uploadProductImageWithProgress", () => {
  const originalXhr = globalThis.XMLHttpRequest;

  afterEach(() => {
    MockXhr.instances = [];
    globalThis.XMLHttpRequest = originalXhr;
    vi.restoreAllMocks();
  });

  it("posts to the expected route and resolves success", async () => {
    globalThis.XMLHttpRequest = MockXhr as unknown as typeof XMLHttpRequest;
    const progress = vi.fn();
    const promise = uploadProductImageWithProgress(
      7,
      new File(["abc"], "photo.png", { type: "image/png" }),
      progress,
    );
    const xhr = MockXhr.instances[0];
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/products/7/upload");
    expect(xhr.sentBody).toBeInstanceOf(FormData);

    xhr.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent<EventTarget>);

    xhr.status = 200;
    xhr.responseText = JSON.stringify({ ok: true });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ ok: true });
    expect(progress).toHaveBeenCalledWith(50);
  });

  it("surfaces parsed backend detail when upload fails", async () => {
    globalThis.XMLHttpRequest = MockXhr as unknown as typeof XMLHttpRequest;
    const promise = uploadProductImageWithProgress(
      7,
      new File(["abc"], "photo.png", { type: "image/png" }),
      () => {},
    );
    const xhr = MockXhr.instances[0];
    xhr.status = 400;
    xhr.responseText = JSON.stringify({ detail: "Arquivo muito grande." });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({
      ok: false,
      error: "Arquivo muito grande.",
    });
  });

  it("returns network error when request fails before response", async () => {
    globalThis.XMLHttpRequest = MockXhr as unknown as typeof XMLHttpRequest;
    const promise = uploadProductImageWithProgress(
      7,
      new File(["abc"], "photo.png", { type: "image/png" }),
      () => {},
    );
    const xhr = MockXhr.instances[0];
    xhr.onerror?.();

    await expect(promise).resolves.toEqual({
      ok: false,
      error: "Erro de rede.",
    });
  });
});
