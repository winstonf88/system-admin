import { useEffect } from "react";
import { useDraggable, useDroppable, useDndContext } from "@dnd-kit/core";

import Button from "@/components/ui/button/Button";
import { MoreDotIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

import type { CategoryDropZone } from "./category-dnd-ids";
import { categoryDragId, categoryDropId } from "./category-dnd-ids";
import type { CategoryTreeNode } from "./types";
import { SavingSpinner } from "./SavingSpinner";

export type TreeNodeProps = {
  node: CategoryTreeNode;
  depth: number;
  editingId: number | null;
  editDraftName: string;
  collapsedIds: Set<number>;
  draggingId: number | null;
  hoveredParentId: number | "root" | null;
  hoveredSiblingDrop: { targetId: number; position: "before" | "after" } | null;
  pendingAction: boolean;
  canDropInto: (targetParentId: number | null, draggedId: number) => boolean;
  getDropZoneEnabled: (
    targetCategoryId: number,
    zone: CategoryDropZone,
  ) => boolean;
  onEditDraftChange: (value: string) => void;
  onStartEdit: (id: number) => void;
  onSaveEdit: (id: number) => void;
  onCancelEdit: () => void;
  creatingChildUnderId: number | null;
  /** When true, root inline create is active; tree actions should be blocked. */
  creatingRoot: boolean;
  createChildDraftName: string;
  onCreateChildDraftChange: (value: string) => void;
  onStartCreateChild: (parentId: number) => void;
  onSaveCreateChild: (parentId: number) => void;
  onCancelCreateChild: () => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number) => void;
  onToggleCollapsed: (id: number) => void;
};

function DropZoneStrip({
  id,
  disabled,
  className,
}: {
  id: string;
  disabled: boolean;
  className: string;
}) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  const allowPointer = active !== null;

  return (
    <div
      ref={setNodeRef}
      className={`${className} z-10 ${allowPointer ? "pointer-events-auto" : "pointer-events-none"} ${
        isOver && !disabled ? "bg-brand-500/15" : ""
      }`}
      aria-hidden
    />
  );
}

export function TreeNode({
  node,
  depth,
  editingId,
  editDraftName,
  collapsedIds,
  draggingId,
  hoveredParentId,
  hoveredSiblingDrop,
  pendingAction,
  canDropInto,
  getDropZoneEnabled,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  creatingChildUnderId,
  creatingRoot,
  createChildDraftName,
  onCreateChildDraftChange,
  onStartCreateChild,
  onSaveCreateChild,
  onCancelCreateChild,
  onDelete,
  onToggleActive,
  onToggleCollapsed,
}: TreeNodeProps) {
  const isEditing = editingId === node.id;
  const isCreatingChildHere = creatingChildUnderId === node.id;
  const isSavingEdit = pendingAction && isEditing;
  const isSavingChild = pendingAction && isCreatingChildHere;
  const editInputId = `category-edit-${node.id}`;
  const createChildInputId = `category-create-child-${node.id}`;
  const isCollapsed = collapsedIds.has(node.id);
  const hasChildren = node.subcategories.length > 0;
  const showSubTree = (hasChildren && !isCollapsed) || isCreatingChildHere;
  const blockActions = creatingChildUnderId !== null || creatingRoot;
  const isHoveredDropTarget =
    draggingId !== null &&
    hoveredParentId === node.id &&
    canDropInto(node.id, draggingId);
  const siblingDropPosition =
    hoveredSiblingDrop && hoveredSiblingDrop.targetId === node.id
      ? hoveredSiblingDrop.position
      : null;

  const dndDisabled = isEditing || isCreatingChildHere || pendingAction;

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: categoryDragId(node.id),
    disabled: dndDisabled,
  });

  const beforeEnabled = !dndDisabled && getDropZoneEnabled(node.id, "before");
  const insideEnabled = !dndDisabled && getDropZoneEnabled(node.id, "inside");
  const afterEnabled = !dndDisabled && getDropZoneEnabled(node.id, "after");

  useEffect(() => {
    if (!isEditing) {
      return;
    }
    const el = document.getElementById(editInputId) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, [isEditing, editInputId]);

  useEffect(() => {
    if (!isCreatingChildHere) {
      return;
    }
    const el = document.getElementById(
      createChildInputId,
    ) as HTMLInputElement | null;
    el?.focus();
  }, [isCreatingChildHere, createChildInputId]);

  return (
    <li className="space-y-2">
      <div
        className={`group relative flex min-h-[44px] items-stretch gap-0 overflow-visible rounded-xl border transition ${
          isEditing
            ? "border-brand-400 bg-brand-50/70 dark:border-brand-500 dark:bg-brand-500/10"
            : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:hover:border-brand-500/40 dark:hover:bg-gray-800/60"
        } ${
          isHoveredDropTarget
            ? "ring-2 ring-brand-400 ring-offset-1 dark:ring-brand-500"
            : ""
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <div className="relative z-20 flex shrink-0 items-center gap-2 pl-3 py-2">
          {!dndDisabled ? (
            <button
              type="button"
              ref={setDragRef}
              className={`flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg text-gray-500 touch-none hover:bg-gray-200/80 active:cursor-grabbing dark:text-gray-400 dark:hover:bg-gray-700 ${
                isDragging ? "cursor-grabbing" : ""
              }`}
              aria-label="Arrastar categoria"
              title="Arrastar"
              {...listeners}
              {...attributes}
            >
              <MoreDotIcon
                width={18}
                height={18}
                className="pointer-events-none block shrink-0"
                aria-hidden
              />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}

          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              if (isCreatingChildHere && !isCollapsed) {
                onCancelCreateChild();
              }
              onToggleCollapsed(node.id);
            }}
            disabled={!hasChildren && !isCreatingChildHere}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs transition ${
              hasChildren || isCreatingChildHere
                ? "text-gray-600 hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-700"
                : "cursor-default text-transparent"
            }`}
            aria-label={
              hasChildren || isCreatingChildHere
                ? isCollapsed
                  ? "Expandir subcategorias"
                  : "Ocultar subcategorias"
                : undefined
            }
          >
            {hasChildren || isCreatingChildHere
              ? isCollapsed
                ? "▸"
                : "▾"
              : "·"}
          </button>
        </div>

        <div className="relative min-w-0 flex-1">
          <DropZoneStrip
            id={categoryDropId(node.id, "before")}
            disabled={!beforeEnabled}
            className="absolute inset-x-0 top-0 h-[32%] rounded-tr-xl"
          />
          <DropZoneStrip
            id={categoryDropId(node.id, "inside")}
            disabled={!insideEnabled}
            className="absolute inset-x-0 top-[32%] h-[36%]"
          />
          <DropZoneStrip
            id={categoryDropId(node.id, "after")}
            disabled={!afterEnabled}
            className="absolute inset-x-0 bottom-0 h-[32%] rounded-br-xl"
          />

          <div className="relative z-0 flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center gap-2 pr-3 py-2 pl-0">
            {isEditing ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input
                  id={editInputId}
                  type="text"
                  value={editDraftName}
                  onChange={(event) => onEditDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSaveEdit(node.id);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancelEdit();
                    }
                  }}
                  autoComplete="off"
                  className="h-9 min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingAction}
                    aria-busy={isSavingEdit}
                    startIcon={
                      isSavingEdit ? (
                        <SavingSpinner className="size-3.5" />
                      ) : undefined
                    }
                    onClick={() => onSaveEdit(node.id)}
                  >
                    {isSavingEdit ? "Salvando…" : "Salvar"}
                  </Button>
                  <button
                    type="button"
                    disabled={pendingAction}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onCancelEdit()}
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className={`truncate text-sm font-medium ${node.is_active ? "text-gray-800 dark:text-white/90" : "text-gray-400 line-through dark:text-gray-500"}`}>
                    {node.name}
                  </span>
                  {node.product_count > 0 && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {node.product_count}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1 overflow-visible">
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartCreateChild(node.id);
                    }}
                    disabled={pendingAction || blockActions}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 p-0 text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                    aria-label="Nova subcategoria"
                    title="Nova subcategoria"
                  >
                    <PlusIcon
                      width={14}
                      height={14}
                      className="pointer-events-none block size-3.5 shrink-0"
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartEdit(node.id);
                    }}
                    disabled={pendingAction || blockActions}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-visible rounded-md border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                    aria-label="Editar nome"
                    title="Editar nome"
                  >
                    <PencilIcon
                      width={18}
                      height={18}
                      className="pointer-events-none block shrink-0 overflow-visible text-current"
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleActive(node.id);
                    }}
                    disabled={pendingAction || blockActions}
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-visible rounded-md border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      node.is_active
                        ? "border-green-200 text-green-600 hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700 dark:border-green-800 dark:text-green-400 dark:hover:border-yellow-700 dark:hover:bg-yellow-900/30 dark:hover:text-yellow-300"
                        : "border-gray-200 text-gray-400 hover:border-green-300 hover:bg-green-50 hover:text-green-700 dark:border-gray-700 dark:text-gray-500 dark:hover:border-green-700 dark:hover:bg-green-900/30 dark:hover:text-green-300"
                    }`}
                    aria-label={node.is_active ? "Desativar categoria" : "Ativar categoria"}
                    title={node.is_active ? "Desativar" : "Ativar"}
                  >
                    {node.is_active ? "●" : "○"}
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(node.id);
                    }}
                    disabled={pendingAction || blockActions}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-visible rounded-md border border-gray-200 text-gray-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    aria-label="Excluir categoria"
                    title="Excluir"
                  >
                    <TrashBinIcon
                      width={18}
                      height={18}
                      className="pointer-events-none block shrink-0 overflow-visible text-current"
                      aria-hidden
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {siblingDropPosition === "before" && (
          <span className="pointer-events-none absolute -top-1 left-3 right-3 z-20 h-0.5 rounded bg-brand-500" />
        )}
        {siblingDropPosition === "after" && (
          <span className="pointer-events-none absolute -bottom-1 left-3 right-3 z-20 h-0.5 rounded bg-brand-500" />
        )}
      </div>

      {showSubTree && (
        <ul className="space-y-2">
          {isCreatingChildHere && (
            <li className="list-none">
              <div
                className="flex flex-wrap items-center gap-2 overflow-visible rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 dark:border-brand-500/50 dark:bg-brand-500/10"
                style={{ marginLeft: `${(depth + 1) * 18}px` }}
              >
                <span className="w-6 shrink-0" aria-hidden />
                <input
                  id={createChildInputId}
                  type="text"
                  value={createChildDraftName}
                  onChange={(event) =>
                    onCreateChildDraftChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSaveCreateChild(node.id);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancelCreateChild();
                    }
                  }}
                  placeholder="Nome da subcategoria"
                  autoComplete="off"
                  className="h-9 min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingAction}
                    aria-busy={isSavingChild}
                    startIcon={
                      isSavingChild ? (
                        <SavingSpinner className="size-3.5" />
                      ) : undefined
                    }
                    onClick={() => onSaveCreateChild(node.id)}
                  >
                    {isSavingChild ? "Salvando…" : "Salvar"}
                  </Button>
                  <button
                    type="button"
                    disabled={pendingAction}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onCancelCreateChild()}
                    className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </li>
          )}
          {hasChildren &&
            !isCollapsed &&
            node.subcategories.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                editingId={editingId}
                editDraftName={editDraftName}
                creatingChildUnderId={creatingChildUnderId}
                creatingRoot={creatingRoot}
                createChildDraftName={createChildDraftName}
                collapsedIds={collapsedIds}
                draggingId={draggingId}
                hoveredParentId={hoveredParentId}
                hoveredSiblingDrop={hoveredSiblingDrop}
                pendingAction={pendingAction}
                canDropInto={canDropInto}
                getDropZoneEnabled={getDropZoneEnabled}
                onEditDraftChange={onEditDraftChange}
                onStartEdit={onStartEdit}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onCreateChildDraftChange={onCreateChildDraftChange}
                onStartCreateChild={onStartCreateChild}
                onSaveCreateChild={onSaveCreateChild}
                onCancelCreateChild={onCancelCreateChild}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                onToggleCollapsed={onToggleCollapsed}
              />
            ))}
        </ul>
      )}
    </li>
  );
}
