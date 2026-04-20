"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  reorderCategorySiblingsAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

import { CategoryTreeSection } from "./CategoryTreeSection";
import type { CategoryTreeNode } from "./types";
import {
  buildUpdatedTree,
  findNode,
  flattenTree,
  insertNode,
  removeNode,
  reorderChildren,
  siblingContext,
} from "./tree-utils";

type Props = {
  initialTree: CategoryTreeNode[];
};

export default function CategoriesManager({ initialTree }: Props) {
  const router = useRouter();
  const [tree, setTree] = useState(initialTree);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraftName, setEditDraftName] = useState("");
  const [creatingChildUnderId, setCreatingChildUnderId] = useState<
    number | null
  >(null);
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

  const canDropInto = (
    targetParentId: number | null,
    draggedId: number,
  ): boolean => {
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
  };

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
      const result = await moveCategoryAction(draggedId, targetParentId);
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) =>
        buildUpdatedTree(current, draggedId, targetParentId),
      );
      toast.success("Categoria movida com sucesso.", { duration: 3000 });
      router.refresh();
    } finally {
      setPendingAction(false);
      setDraggingId(null);
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
    }
  };

  const getDropIntent = (
    draggedId: number,
    targetId: number,
    clientY: number,
    rowTop: number,
    rowHeight: number,
  ): "before" | "after" | "inside" | null => {
    if (!Number.isFinite(draggedId) || draggedId === targetId) {
      return null;
    }
    const draggedContext = siblingContext(tree, draggedId);
    const targetContext = siblingContext(tree, targetId);
    if (!draggedContext || !targetContext) {
      return null;
    }
    const canDropAsChild = canDropInto(targetId, draggedId);
    if (draggedContext.parentId !== targetContext.parentId) {
      return canDropAsChild ? "inside" : null;
    }
    const relativeY = clientY - rowTop;
    const edgeThreshold = Math.max(10, rowHeight * 0.28);
    if (relativeY <= edgeThreshold) {
      return "before";
    }
    if (relativeY >= rowHeight - edgeThreshold) {
      return "after";
    }
    return canDropAsChild ? "inside" : null;
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
      const result = await reorderCategorySiblingsAction({
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
      router.refresh();
    } finally {
      setPendingAction(false);
      setDraggingId(null);
      setHoveredParentId(null);
      setHoveredSiblingDrop(null);
    }
  };

  const canMoveNode = (categoryId: number, direction: "up" | "down") => {
    const context = siblingContext(tree, categoryId);
    if (!context) {
      return false;
    }
    if (direction === "up") {
      return context.index > 0;
    }
    return context.index < context.siblingIds.length - 1;
  };

  const reorderCategoryById = async (
    categoryId: number,
    direction: "up" | "down",
  ) => {
    const context = siblingContext(tree, categoryId);
    if (!context) {
      return;
    }

    const targetIndex =
      direction === "up" ? context.index - 1 : context.index + 1;
    if (targetIndex < 0 || targetIndex >= context.siblingIds.length) {
      return;
    }

    const orderedIds = [...context.siblingIds];
    const currentId = orderedIds[context.index];
    orderedIds[context.index] = orderedIds[targetIndex];
    orderedIds[targetIndex] = currentId;

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await reorderCategorySiblingsAction({
        parent_id: context.parentId,
        ordered_ids: orderedIds,
      });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      setTree((current) =>
        reorderChildren(current, context.parentId, orderedIds),
      );
      toast.success("Ordem atualizada com sucesso.", { duration: 3000 });
      router.refresh();
    } finally {
      setPendingAction(false);
      setHoveredSiblingDrop(null);
    }
  };

  const handleStartEdit = (id: number) => {
    const node = findNode(tree, id);
    if (!node) {
      return;
    }
    setCreatingChildUnderId(null);
    setCreateChildDraftName("");
    setEditingId(id);
    setEditDraftName(node.name);
    toast.dismiss();
  };

  const handleStartCreateChild = (parentId: number) => {
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

  const handleSaveCreateChild = async (parentId: number) => {
    const trimmed = createChildDraftName.trim();
    if (!trimmed) {
      toast.error("Informe um nome para a subcategoria.", { duration: 5000 });
      return;
    }

    toast.dismiss();
    setPendingAction(true);
    try {
      const result = await createCategoryAction({
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
        subcategories: [],
      };
      setTree((current) => insertNode(current, parentId, newNode));
      setCreatingChildUnderId(null);
      setCreateChildDraftName("");
      toast.success("Subcategoria criada com sucesso.", { duration: 3000 });
      router.refresh();
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
      const result = await updateCategoryAction(categoryId, {
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
      router.refresh();
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
      const result = await deleteCategoryAction(categoryId);
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
      router.refresh();
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
        canMoveNode={canMoveNode}
        getDropIntent={getDropIntent}
        creatingChildUnderId={creatingChildUnderId}
        createChildDraftName={createChildDraftName}
        onEditDraftChange={setEditDraftName}
        onStartEdit={handleStartEdit}
        onSaveEdit={handleSaveCategoryName}
        onCancelEdit={handleCancelEdit}
        onCreateChildDraftChange={setCreateChildDraftName}
        onStartCreateChild={handleStartCreateChild}
        onSaveCreateChild={handleSaveCreateChild}
        onCancelCreateChild={handleCancelCreateChild}
        onDelete={handleDeleteCategory}
        onDrop={(draggedId, parentId) => {
          void handleDrop(draggedId, parentId);
        }}
        onReorderNode={(categoryId, direction) => {
          void reorderCategoryById(categoryId, direction);
        }}
        onSiblingDrop={(draggedId, targetId, position) => {
          void handleSiblingDrop(draggedId, targetId, position);
        }}
        onDragStart={(id) => {
          setDraggingId(id);
          setHoveredSiblingDrop(null);
        }}
        onDragEnd={() => {
          setDraggingId(null);
          setHoveredParentId(null);
          setHoveredSiblingDrop(null);
        }}
        onDragHover={(targetId) => {
          setHoveredParentId(targetId);
        }}
        onSiblingHover={(targetId, position) => {
          if (targetId === null || position === null) {
            setHoveredSiblingDrop(null);
            return;
          }
          setHoveredSiblingDrop({ targetId, position });
        }}
        onToggleCollapsed={toggleCollapsed}
        onRootDragLeave={() => {
          if (hoveredParentId === "root") {
            setHoveredParentId(null);
          }
        }}
        onRootDragOver={(event) => {
          const draggedId =
            draggingId ??
            Number(event.dataTransfer.getData("text/category-id"));
          if (!Number.isFinite(draggedId)) {
            return;
          }
          if (!canDropInto(null, draggedId)) {
            return;
          }
          event.preventDefault();
          setHoveredParentId("root");
          setHoveredSiblingDrop(null);
        }}
        onRootDrop={(event) => {
          event.preventDefault();
          const draggedId =
            draggingId ??
            Number(event.dataTransfer.getData("text/category-id"));
          if (!Number.isFinite(draggedId)) {
            return;
          }
          setHoveredParentId(null);
          void handleDrop(draggedId, null);
        }}
      />
    </div>
  );
}
