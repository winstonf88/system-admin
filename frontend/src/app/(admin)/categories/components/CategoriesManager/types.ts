export type CategoryTreeNode = {
  id: number;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  product_count: number;
  subcategories: CategoryTreeNode[];
};
