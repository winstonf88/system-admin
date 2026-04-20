/** Mirrors backend ProductRead / ProductVariationRead */
export type ProductVariationRow = {
  id: number;
  size: string | null;
  color: string | null;
  quantity: number;
};

export type ProductRow = {
  id: number;
  name: string;
  description: string | null;
  category_id: number;
  image_url: string | null;
  variations: ProductVariationRow[];
};

export type CategoryOption = {
  id: number;
  name: string;
  parent_id: number | null;
};
