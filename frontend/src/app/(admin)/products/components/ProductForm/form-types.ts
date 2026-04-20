/** Product image upload limit (must stay at or below Next.js body limits). */
export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
/** Max files per drop selection (UI batch). */
export const MAX_IMAGE_FILES = 5;
/** Total images per product (aligned with backend). */
export const MAX_PRODUCT_IMAGES = 10;

export function formatMaxImageLabel(): string {
  return `${Math.round(MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024))} MB`;
}

export type PendingFileItem = { id: string; file: File };

export type UploadProgressItem = {
  id: string;
  fileName: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

export type VariationDraft = { key: string; size: string; color: string; quantity: number };

export type SavedImageUrl = { id: number; src: string };

export function buildVariations(rows: VariationDraft[]) {
  return rows
    .filter((r) => r.size.trim() || r.color.trim())
    .map((r) => ({
      size: r.size.trim() || null,
      color: r.color.trim() || null,
      quantity: Math.max(0, Number(r.quantity) || 0),
    }));
}
