import { describe, expect, it } from "vitest";

import type { CategoryTreeNode } from "../types";
import {
  buildUpdatedTree,
  flattenTree,
  getValidDropZones,
  reorderChildren,
  siblingContext,
} from "../tree-utils";

describe("tree-utils", () => {
  const node = (
    id: number,
    name: string,
    parent_id: number | null,
    subcategories: CategoryTreeNode[] = [],
  ): CategoryTreeNode => ({ id, name, parent_id, is_active: true, product_count: 0, subcategories });

  const sample: CategoryTreeNode[] = [
    node(1, "A", null, [
      node(11, "A1", 1),
      node(12, "A2", 1),
    ]),
    node(2, "B", null),
  ];

  it("flattenTree preserves depth and ancestors", () => {
    const flat = flattenTree(sample);
    expect(
      flat.map((f) => ({
        id: f.id,
        depth: f.depth,
        ancestorIds: f.ancestorIds,
      })),
    ).toEqual([
      { id: 1, depth: 0, ancestorIds: [] },
      { id: 11, depth: 1, ancestorIds: [1] },
      { id: 12, depth: 1, ancestorIds: [1] },
      { id: 2, depth: 0, ancestorIds: [] },
    ]);
  });

  it("buildUpdatedTree moves a node to a new parent", () => {
    const next = buildUpdatedTree(sample, 11, null);
    const roots = next.map((n) => n.id);
    expect(roots).toContain(11);
    const underA =
      next.find((n) => n.id === 1)?.subcategories.map((c) => c.id) ?? [];
    expect(underA).not.toContain(11);
  });

  it("reorderChildren reorders root-level nodes", () => {
    const reordered = reorderChildren(sample, null, [2, 1]);
    expect(reordered.map((n) => n.id)).toEqual([2, 1]);
  });

  it("reorderChildren reorders nested children", () => {
    const reordered = reorderChildren(sample, 1, [12, 11]);
    const a = reordered.find((n) => n.id === 1);
    expect(a?.subcategories.map((c) => c.id)).toEqual([12, 11]);
  });

  it("siblingContext finds sibling ids and index", () => {
    const ctx = siblingContext(sample, 12);
    expect(ctx).toEqual({
      parentId: 1,
      siblingIds: [11, 12],
      index: 1,
    });
  });

  it("getValidDropZones allows before/after only for same parent", () => {
    const allow = () => true;
    const same = getValidDropZones(sample, 11, 12, allow);
    expect(same).toEqual({ before: true, after: true, inside: true });

    const cross = getValidDropZones(sample, 11, 2, allow);
    expect(cross).toEqual({ before: false, after: false, inside: true });
  });

  it("getValidDropZones disables all zones when target is self", () => {
    const allow = () => true;
    expect(getValidDropZones(sample, 11, 11, allow)).toEqual({
      before: false,
      after: false,
      inside: false,
    });
  });
});
