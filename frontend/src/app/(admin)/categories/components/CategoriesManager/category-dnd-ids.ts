export const CATEGORY_DRAG_PREFIX = "category-drag-";
export const CATEGORY_DROP_ROOT = "category-drop-root";

export type CategoryDropZone = "before" | "inside" | "after";

export function categoryDragId(categoryId: number): string {
  return `${CATEGORY_DRAG_PREFIX}${categoryId}`;
}

export function categoryDropId(
  categoryId: number,
  zone: CategoryDropZone,
): string {
  return `category-drop-${categoryId}-${zone}`;
}

export function parseCategoryDragId(id: string): number | null {
  if (!id.startsWith(CATEGORY_DRAG_PREFIX)) {
    return null;
  }
  const n = Number(id.slice(CATEGORY_DRAG_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

export function parseCategoryDropId(
  id: string,
): { categoryId: number; zone: CategoryDropZone } | null {
  const m = /^category-drop-(\d+)-(before|inside|after)$/.exec(id);
  if (!m) {
    return null;
  }
  const categoryId = Number(m[1]);
  const zone = m[2] as CategoryDropZone;
  if (!Number.isFinite(categoryId)) {
    return null;
  }
  return { categoryId, zone };
}
