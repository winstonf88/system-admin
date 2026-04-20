import type { CategoryOption } from "@/components/products/product-types";

export function categoryOptionLabel(categories: CategoryOption[], categoryId: number): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const c = byId.get(categoryId);
  if (!c) {
    return `#${categoryId}`;
  }
  if (c.parent_id != null) {
    const p = byId.get(c.parent_id);
    return p ? `${p.name} › ${c.name}` : c.name;
  }
  return c.name;
}

export function sortedCategorySelectOptions(categories: CategoryOption[]): { id: number; label: string }[] {
  return categories
    .map((c) => ({ id: c.id, label: categoryOptionLabel(categories, c.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"));
}
