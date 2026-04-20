import type { CategoryTreeNode } from "./types";

export type FlatCategory = {
  id: number;
  name: string;
  parent_id: number | null;
  depth: number;
  ancestorIds: number[];
};

export function flattenTree(
  tree: CategoryTreeNode[],
  depth = 0,
  ancestorIds: number[] = [],
): FlatCategory[] {
  const items: FlatCategory[] = [];
  for (const node of tree) {
    items.push({
      id: node.id,
      name: node.name,
      parent_id: node.parent_id,
      depth,
      ancestorIds,
    });
    items.push(...flattenTree(node.subcategories, depth + 1, [...ancestorIds, node.id]));
  }
  return items;
}

export function findNode(tree: CategoryTreeNode[], nodeId: number): CategoryTreeNode | null {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node;
    }
    const child = findNode(node.subcategories, nodeId);
    if (child) {
      return child;
    }
  }
  return null;
}

export function removeNode(
  tree: CategoryTreeNode[],
  nodeId: number,
): { tree: CategoryTreeNode[]; removed: CategoryTreeNode | null } {
  let removed: CategoryTreeNode | null = null;

  const next = tree
    .map((node) => {
      if (node.id === nodeId) {
        removed = node;
        return null;
      }

      const childResult = removeNode(node.subcategories, nodeId);
      if (childResult.removed) {
        removed = childResult.removed;
      }
      return {
        ...node,
        subcategories: childResult.tree,
      };
    })
    .filter((node): node is CategoryTreeNode => node !== null);

  return { tree: next, removed };
}

export function insertNode(
  tree: CategoryTreeNode[],
  parentId: number | null,
  node: CategoryTreeNode,
): CategoryTreeNode[] {
  if (parentId === null) {
    return [...tree, node];
  }

  return tree.map((item) => {
    if (item.id === parentId) {
      return {
        ...item,
        subcategories: [...item.subcategories, node],
      };
    }
    return {
      ...item,
      subcategories: insertNode(item.subcategories, parentId, node),
    };
  });
}

export function buildUpdatedTree(
  tree: CategoryTreeNode[],
  nodeId: number,
  parentId: number | null,
): CategoryTreeNode[] {
  const removedResult = removeNode(tree, nodeId);
  if (!removedResult.removed) {
    return tree;
  }
  const movedNode: CategoryTreeNode = {
    ...removedResult.removed,
    parent_id: parentId,
  };
  return insertNode(removedResult.tree, parentId, movedNode);
}

export function reorderChildren(
  tree: CategoryTreeNode[],
  parentId: number | null,
  orderedIds: number[],
): CategoryTreeNode[] {
  if (parentId === null) {
    const byId = new Map(tree.map((node) => [node.id, node]));
    return orderedIds.map((id) => byId.get(id)).filter((node): node is CategoryTreeNode => Boolean(node));
  }

  return tree.map((node) => {
    if (node.id === parentId) {
      const byId = new Map(node.subcategories.map((child) => [child.id, child]));
      return {
        ...node,
        subcategories: orderedIds
          .map((id) => byId.get(id))
          .filter((child): child is CategoryTreeNode => Boolean(child)),
      };
    }
    return {
      ...node,
      subcategories: reorderChildren(node.subcategories, parentId, orderedIds),
    };
  });
}

export function siblingContext(
  tree: CategoryTreeNode[],
  categoryId: number,
  parentId: number | null = null,
): { parentId: number | null; siblingIds: number[]; index: number } | null {
  const siblingIds = tree.map((node) => node.id);
  const index = siblingIds.indexOf(categoryId);
  if (index >= 0) {
    return { parentId, siblingIds, index };
  }

  for (const node of tree) {
    const childResult = siblingContext(node.subcategories, categoryId, node.id);
    if (childResult) {
      return childResult;
    }
  }
  return null;
}
