"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import {
  createCategory,
  deleteCategory,
  moveCategory,
  reorderCategorySiblings,
  toggleCategoryActive,
  updateCategory,
} from "@/lib/api-client/categories";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

import type { CategoryDropZone } from "./category-dnd-ids";
import {
  CATEGORY_DROP_ROOT,
  parseCategoryDragId,
  parseCategoryDropId,
} from "./category-dnd-ids";
import { CategoryTreeSection } from "./CategoryTreeSection";
import type { CategoryTreeNode } from "./types";
import {
  buildUpdatedTree,
  findNode,
  flattenTree,
  getValidDropZones,
  insertNode,
  removeNode,
  reorderChildren,
  siblingContext,
} from "./tree-utils";

type Props = {
  initialTree: CategoryTreeNode[];
};

export default function CategoriesManager({ initialTree }: Props) {
  const [tree, setTree] = useState(initialTree);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraftName, setEditDraftName] = useState("");
  const [creatingChildUnderId, setCreatingChildUnderId] = useState<
    number | null
  >(null);
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [createChildDraftName, setCreateChildDraftName] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [hoveredParentId, setHoveredParentId] = useState<
    number | "root" | null
  >(null);
  const [hoveredSiblingDrop, setHoveredSiblingDrop] = useState<{
    targetId: number;
    position: "before" | "after";
  } | null>(null);
  const [dragOverlayLabel, setDragOverlayLabel] = useState<string | null>(null);
  const draggingIdRef = useRef<number | null>(null);

  const [pendingAction, setPendingAction] = useState(false);

  const flatCategories = useMemo(() => flattenTree(tree), [tree]);

  const categoryMetaById = useMemo(
    () =>
      new Map(
        flatCategories.map((item) => [
          item.id,
          {
            parentId: item.parent_id,
            ancestorIds: item.ancestorIds,
            name: item.name,
          },
        ]),
      ),
    [flatCategories],
  );

  const canDropInto = useCallback(
    (targetParentId: number | null, draggedId: number): boolean => {
      if (!Number.isFinite(draggedId)) {
        return false;
      }
      if (targetParentId === draggedId) {
        return false;
      }
      if (targetParentId !== null) {
        const targetMeta = categoryMetaById.get(targetParentId);
        if (!targetMeta) {
          return false;
        }
        if (targetMeta.ancestorIds.includes(draggedId)) {
          return false;
        }
      }
      return true;
    },
    [categoryMetaById],
  );

  const getDropZoneEnabled = useCallback(
    (targetCategoryId: number, zone: CategoryDropZone) => {
      const id = draggingIdRef.current ?? draggingId;
      if (id === null) {
        return false;
      }
      return getValidDropZones(tree, id, targetCategoryId, canDropInto)[zone];
    },
    [tree, draggingId, canDropInto],
  );

  const handleDrop = async (
    draggedId: number,
    targetParentId: number | null,
  ) => {
    if (!canDropInto(targetParentId, draggedId)) {
      return;
    }

    const draggingMeta = categoryMetaById.get(draggedId);
    if (draggingMeta && draggingMeta.parentId === targetParentId) {
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await moveCategory(draggedId, targetParentId);
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) =>
        buildUpdatedTree(current, draggedId, targetParentId),
      );
      toast.success("Categoria movida com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
      setDraggingId(null);
      draggingIdRef.current = null;
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
    }
  };

  const handleSiblingDrop = async (
    draggedId: number,
    targetId: number,
    position: "before" | "after",
  ) => {
    const draggedContext = siblingContext(tree, draggedId);
    const targetContext = siblingContext(tree, targetId);
    if (!draggedContext || !targetContext) {
      return;
    }
    if (draggedContext.parentId !== targetContext.parentId) {
      return;
    }

    const orderedIds = targetContext.siblingIds.filter(
      (id) => id !== draggedId,
    );
    const targetIndex = orderedIds.indexOf(targetId);
    if (targetIndex < 0) {
      return;
    }

    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
    orderedIds.splice(insertIndex, 0, draggedId);

    const isSameOrder =
      orderedIds.length === targetContext.siblingIds.length &&
      orderedIds.every((id, index) => id === targetContext.siblingIds[index]);
    if (isSameOrder) {
      setHoveredSiblingDrop(null);
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await reorderCategorySiblings({
        parent_id: targetContext.parentId,
        ordered_ids: orderedIds,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) =>
        reorderChildren(current, targetContext.parentId, orderedIds),
      );
      toast.success("Ordem atualizada com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
      setDraggingId(null);
      draggingIdRef.current = null;
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
    }
  };

  const clearDragState = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setHoveredParentId(null);
    setHoveredSiblingDrop(null);
    setDragOverlayLabel(null);
  };

  const handleDndDragStart = (event: DragStartEvent) => {
    const id = parseCategoryDragId(String(event.active.id));
    draggingIdRef.current = id;
    setDraggingId(id);
    setHoveredSiblingDrop(null);
    if (id !== null) {
      const node = findNode(tree, id);
      setDragOverlayLabel(node?.name ?? null);
    } else {
      setDragOverlayLabel(null);
    }
  };

  const handleDndDragOver = (event: DragOverEvent) => {
    const dragId =
      draggingIdRef.current ?? parseCategoryDragId(String(event.active.id));
    if (dragId === null) {
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
      return;
    }
    const over = event.over;
    if (!over) {
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
      return;
    }
    const overId = String(over.id);
    if (overId === CATEGORY_DROP_ROOT) {
      if (canDropInto(null, dragId)) {
        setHoveredParentId("root");
        setHoveredSiblingDrop(null);
      }
      return;
    }
    const parsed = parseCategoryDropId(overId);
    if (!parsed) {
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
      return;
    }
    const { categoryId, zone } = parsed;
    const zones = getValidDropZones(tree, dragId, categoryId, canDropInto);
    if (zone === "before" && zones.before) {
      setHoveredParentId(null);
      setHoveredSiblingDrop({ targetId: categoryId, position: "before" });
      return;
    }
    if (zone === "after" && zones.after) {
      setHoveredParentId(null);
      setHoveredSiblingDrop({ targetId: categoryId, position: "after" });
      return;
    }
    if (zone === "inside" && zones.inside) {
      setHoveredParentId(categoryId);
      setHoveredSiblingDrop(null);
      return;
    }
    setHoveredParentId(null);
    setHoveredSiblingDrop(null);
  };

  const handleDndDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const dragId = parseCategoryDragId(String(active.id));
    clearDragState();

    if (dragId === null || !over) {
      return;
    }

    const overId = String(over.id);
    if (overId === CATEGORY_DROP_ROOT) {
      void handleDrop(dragId, null);
      return;
    }

    const parsed = parseCategoryDropId(overId);
    if (!parsed) {
      return;
    }

    const { categoryId, zone } = parsed;
    if (categoryId === dragId) {
      return;
    }

    const zones = getValidDropZones(tree, dragId, categoryId, canDropInto);
    if (zone === "before" && zones.before) {
      void handleSiblingDrop(dragId, categoryId, "before");
      return;
    }
    if (zone === "after" && zones.after) {
      void handleSiblingDrop(dragId, categoryId, "after");
      return;
    }
    if (zone === "inside" && zones.inside) {
      void handleDrop(dragId, categoryId);
    }
  };

  const handleDndDragCancel = () => {
    clearDragState();
  };

  const handleStartEdit = (id: number) => {
    const node = findNode(tree, id);
    if (!node) {
      return;
    }
    setCreatingRoot(false);
    setCreatingChildUnderId(null);
    setCreateChildDraftName("");
    setEditingId(id);
    setEditDraftName(node.name);
    toast.dismiss();
  };

  const handleStartCreateChild = (parentId: number) => {
    setCreatingRoot(false);
    setEditingId(null);
    setEditDraftName("");
    setCreatingChildUnderId(parentId);
    setCreateChildDraftName("");
    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(parentId);
      return next;
    });
    toast.dismiss();
  };

  const handleCancelCreateChild = () => {
    setCreatingChildUnderId(null);
    setCreateChildDraftName("");
  };

  const handleStartCreateRoot = () => {
    setEditingId(null);
    setEditDraftName("");
    setCreatingChildUnderId(null);
    setCreatingRoot(true);
    setCreateChildDraftName("");
    toast.dismiss();
  };

  const handleCancelCreateRoot = () => {
    setCreatingRoot(false);
    setCreateChildDraftName("");
  };

  const handleSaveCreateRoot = async () => {
    const trimmed = createChildDraftName.trim();
    if (!trimmed) {
      toast.error("Informe um nome para a categoria.", { duration: 5000 });
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await createCategory({
        name: trimmed,
        parent_id: null,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      const newNode: CategoryTreeNode = {
        id: result.category.id,
        name: result.category.name,
        parent_id: result.category.parent_id,
        is_active: true,
        product_count: 0,
        subcategories: [],
      };
      setTree((current) => insertNode(current, null, newNode));
      setCreatingRoot(false);
      setCreateChildDraftName("");
      toast.success("Categoria criada com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
    }
  };

  const handleSaveCreateChild = async (parentId: number) => {
    const trimmed = createChildDraftName.trim();
    if (!trimmed) {
      toast.error("Informe um nome para a subcategoria.", { duration: 5000 });
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await createCategory({
        name: trimmed,
        parent_id: parentId,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      const newNode: CategoryTreeNode = {
        id: result.category.id,
        name: result.category.name,
        parent_id: result.category.parent_id,
        is_active: true,
        product_count: 0,
        subcategories: [],
      };
      setTree((current) => insertNode(current, parentId, newNode));
      setCreatingChildUnderId(null);
      setCreateChildDraftName("");
      toast.success("Subcategoria criada com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraftName("");
  };

  const handleSaveCategoryName = async (categoryId: number) => {
    const node = findNode(tree, categoryId);
    if (!node) {
      return;
    }
    const trimmed = editDraftName.trim();
    if (!trimmed) {
      toast.error("O nome da categoria não pode ficar vazio.", {
        duration: 5000,
      });
      return;
    }

    if (trimmed === node.name) {
      handleCancelEdit();
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await updateCategory(categoryId, {
        name: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }

      setTree((current) => {
        const updateName = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
          nodes.map((n) => ({
            ...n,
            name: n.id === result.category.id ? result.category.name : n.name,
            subcategories: updateName(n.subcategories),
          }));
        return updateName(current);
      });

      setEditingId(null);
      setEditDraftName("");
      toast.success("Categoria atualizada com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    const node = findNode(tree, categoryId);
    if (!node) {
      return;
    }
    const confirmed = window.confirm(
      `Excluir "${node.name}"? Esta ação não poderá ser desfeita.`,
    );
    if (!confirmed) {
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await deleteCategory(categoryId);
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) => removeNode(current, categoryId).tree);
      if (editingId === categoryId) {
        setEditingId(null);
        setEditDraftName("");
      }
      if (creatingChildUnderId === categoryId) {
        setCreatingChildUnderId(null);
        setCreateChildDraftName("");
      }
      toast.success("Categoria excluída com sucesso.", { duration: 3000 });
    } finally {
      setPendingAction(false);
    }
  };

  const handleToggleActive = async (categoryId: number) => {
    const node = findNode(tree, categoryId);
    if (!node) {
      return;
    }
    const next = !node.is_active;
    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await toggleCategoryActive(categoryId, next);
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) => {
        const update = (nodes: CategoryTreeNode[]): CategoryTreeNode[] =>
          nodes.map((n) => ({
            ...n,
            is_active: n.id === categoryId ? next : n.is_active,
            subcategories: update(n.subcategories),
          }));
        return update(current);
      });
      toast.success(
        next ? "Categoria ativada." : "Categoria desativada.",
        { duration: 3000 },
      );
    } finally {
      setPendingAction(false);
    }
  };

  const toggleCollapsed = (categoryId: number) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageBreadCrumb pageTitle="Categorias" />

      <CategoryTreeSection
        tree={tree}
        editingId={editingId}
        editDraftName={editDraftName}
        collapsedIds={collapsedIds}
        draggingId={draggingId}
        hoveredParentId={hoveredParentId}
        hoveredSiblingDrop={hoveredSiblingDrop}
        pendingAction={pendingAction}
        canDropInto={canDropInto}
        getDropZoneEnabled={getDropZoneEnabled}
        dragOverlayLabel={dragOverlayLabel}
        creatingRoot={creatingRoot}
        creatingChildUnderId={creatingChildUnderId}
        createChildDraftName={createChildDraftName}
        onEditDraftChange={setEditDraftName}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleSaveCategoryName}
        onCancelEdit={handleCancelEdit}
        onCreateChildDraftChange={setCreateChildDraftName}
        onStartCreateRoot={handleStartCreateRoot}
        onSaveCreateRoot={handleSaveCreateRoot}
        onCancelCreateRoot={handleCancelCreateRoot}
        onStartCreateChild={handleStartCreateChild}
        onSaveCreateChild={handleSaveCreateChild}
        onCancelCreateChild={handleCancelCreateChild}
        onDelete={handleDeleteCategory}
        onToggleActive={handleToggleActive}
        onToggleCollapsed={toggleCollapsed}
        onDndDragStart={handleDndDragStart}
        onDndDragOver={handleDndDragOver}
        onDndDragEnd={handleDndDragEnd}
        onDndDragCancel={handleDndDragCancel}
      />
    </div>
  );
}
