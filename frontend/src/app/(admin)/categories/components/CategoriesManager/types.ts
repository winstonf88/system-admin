export type CategoryTreeNode = {
  id: number;
  name: string;
  parent_id: number | null;
  subcategories: CategoryTreeNode[];
};
