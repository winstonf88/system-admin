/** Mirrors backend ProductRead / ProductVariationRead */
export type ProductVariationRow = {
  id: number;
  size: string | null;
  color: string | null;
  quantity: number;
};

/** Mirrors backend ProductImageRead */
export type ProductImageRow = {
  id: number;
  url: string;
};

export type ProductRow = {
  id: number;
  name: string;
  price: number;
  description: string | null;
  category_ids: number[];
  images: ProductImageRow[];
  variations: ProductVariationRow[];
};

export type CategoryOption = {
  id: number;
  name: string;
  parent_id: number | null;
};
