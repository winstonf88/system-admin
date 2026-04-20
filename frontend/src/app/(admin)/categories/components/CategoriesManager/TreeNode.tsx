import { useEffect } from "react";

import Button from "@/components/ui/button/Button";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, TrashBinIcon } from "@/icons";

import type { CategoryTreeNode } from "./types";

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
  canMoveNode: (categoryId: number, direction: "up" | "down") => boolean;
  getDropIntent: (
    draggedId: number,
    targetId: number,
    clientY: number,
    rowTop: number,
    rowHeight: number,
  ) => "before" | "after" | "inside" | null;
  onEditDraftChange: (value: string) => void;
  onStartEdit: (id: number) => void;
  onSaveEdit: (id: number) => void;
  onCancelEdit: () => void;
  creatingChildUnderId: number | null;
  createChildDraftName: string;
  onCreateChildDraftChange: (value: string) => void;
  onStartCreateChild: (parentId: number) => void;
  onSaveCreateChild: (parentId: number) => void;
  onCancelCreateChild: () => void;
  onDelete: (id: number) => void;
  onDrop: (draggedId: number, targetParentId: number | null) => void;
  onReorderNode: (categoryId: number, direction: "up" | "down") => void;
  onSiblingDrop: (draggedId: number, targetId: number, position: "before" | "after") => void;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onDragHover: (targetId: number | "root" | null) => void;
  onSiblingHover: (targetId: number | null, position: "before" | "after" | null) => void;
  onToggleCollapsed: (id: number) => void;
};

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
  canMoveNode,
  getDropIntent,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  creatingChildUnderId,
  createChildDraftName,
  onCreateChildDraftChange,
  onStartCreateChild,
  onSaveCreateChild,
  onCancelCreateChild,
  onDelete,
  onDrop,
  onReorderNode,
  onSiblingDrop,
  onDragStart,
  onDragEnd,
  onDragHover,
  onSiblingHover,
  onToggleCollapsed,
}: TreeNodeProps) {
  const isEditing = editingId === node.id;
  const isCreatingChildHere = creatingChildUnderId === node.id;
  const editInputId = `category-edit-${node.id}`;
  const createChildInputId = `category-create-child-${node.id}`;
  const isCollapsed = collapsedIds.has(node.id);
  const hasChildren = node.subcategories.length > 0;
  const showSubTree = (hasChildren && !isCollapsed) || isCreatingChildHere;
  const blockActions = creatingChildUnderId !== null;
  const isHoveredDropTarget =
    draggingId !== null &&
    hoveredParentId === node.id &&
    canDropInto(node.id, draggingId);
  const siblingDropPosition =
    hoveredSiblingDrop && hoveredSiblingDrop.targetId === node.id
      ? hoveredSiblingDrop.position
      : null;

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
    const el = document.getElementById(createChildInputId) as HTMLInputElement | null;
    el?.focus();
  }, [isCreatingChildHere, createChildInputId]);

  return (
    <li className="space-y-2">
      <div
        className={`group relative flex items-center gap-2 overflow-visible rounded-xl border px-3 py-2 transition ${
          isEditing
            ? "border-brand-400 bg-brand-50/70 dark:border-brand-500 dark:bg-brand-500/10"
            : "border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:hover:border-brand-500/40 dark:hover:bg-gray-800/60"
        } ${
          isHoveredDropTarget
            ? "ring-2 ring-brand-400 ring-offset-1 dark:ring-brand-500"
            : ""
        }`}
        style={{ marginLeft: `${depth * 18}px` }}
        draggable={!isEditing && !isCreatingChildHere}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/category-id", String(node.id));
          event.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          if (isEditing || isCreatingChildHere) {
            return;
          }
          const draggedId = Number(event.dataTransfer.getData("text/category-id"));
          if (!Number.isFinite(draggedId)) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const dropIntent = getDropIntent(
            draggedId,
            node.id,
            event.clientY,
            rect.top,
            rect.height,
          );
          if (dropIntent === "before" || dropIntent === "after") {
            event.preventDefault();
            onDragHover(null);
            onSiblingHover(node.id, dropIntent);
            return;
          }
          if (dropIntent === "inside") {
            event.preventDefault();
            onSiblingHover(null, null);
            onDragHover(node.id);
            return;
          }
          onSiblingHover(null, null);
          onDragHover(null);
        }}
        onDrop={(event) => {
          if (isEditing || isCreatingChildHere) {
            return;
          }
          event.preventDefault();
          const draggedId = Number(event.dataTransfer.getData("text/category-id"));
          if (!Number.isFinite(draggedId)) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const dropIntent = getDropIntent(
            draggedId,
            node.id,
            event.clientY,
            rect.top,
            rect.height,
          );
          if (dropIntent === "before" || dropIntent === "after") {
            onSiblingDrop(draggedId, node.id, dropIntent);
            onSiblingHover(null, null);
            onDragHover(null);
            return;
          }
          if (dropIntent === "inside" && canDropInto(node.id, draggedId)) {
            onDrop(draggedId, node.id);
            onDragHover(null);
            onSiblingHover(null, null);
          }
        }}
      >
        {siblingDropPosition === "before" && (
          <span className="pointer-events-none absolute -top-1 left-3 right-3 h-0.5 rounded bg-brand-500" />
        )}
        {siblingDropPosition === "after" && (
          <span className="pointer-events-none absolute -bottom-1 left-3 right-3 h-0.5 rounded bg-brand-500" />
        )}
        <button
          type="button"
          onMouseDown={(event) => event.stopPropagation()}
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
          {hasChildren || isCreatingChildHere ? (isCollapsed ? "▸" : "▾") : "·"}
        </button>

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
                onClick={() => onSaveEdit(node.id)}
              >
                {pendingAction ? "Salvando..." : "Salvar"}
              </Button>
              <button
                type="button"
                disabled={pendingAction}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onCancelEdit()}
                className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{node.name}</span>
            <button
              type="button"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onStartEdit(node.id);
              }}
              disabled={pendingAction || blockActions}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-visible rounded-md text-gray-500 transition hover:bg-gray-200/80 hover:text-gray-800 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
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
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1 overflow-visible">
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onReorderNode(node.id, "up");
            }}
            disabled={pendingAction || isEditing || blockActions || !canMoveNode(node.id, "up")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Subir categoria"
            title="Subir"
          >
            <ArrowUpIcon
              width={16}
              height={16}
              className="pointer-events-none block shrink-0 text-current"
              aria-hidden
            />
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onReorderNode(node.id, "down");
            }}
            disabled={pendingAction || isEditing || blockActions || !canMoveNode(node.id, "down")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Descer categoria"
            title="Descer"
          >
            <ArrowDownIcon
              width={16}
              height={16}
              className="pointer-events-none block shrink-0 text-current"
              aria-hidden
            />
          </button>
          {!isEditing && (
            <>
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
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
                onMouseDown={(event) => event.stopPropagation()}
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
            </>
          )}
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            #{node.id}
          </span>
        </div>
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
                  onChange={(event) => onCreateChildDraftChange(event.target.value)}
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
                    onClick={() => onSaveCreateChild(node.id)}
                  >
                    {pendingAction ? "Salvando..." : "Salvar"}
                  </Button>
                  <button
                    type="button"
                    disabled={pendingAction}
                    onMouseDown={(event) => event.stopPropagation()}
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
              createChildDraftName={createChildDraftName}
              collapsedIds={collapsedIds}
              draggingId={draggingId}
              hoveredParentId={hoveredParentId}
              hoveredSiblingDrop={hoveredSiblingDrop}
              pendingAction={pendingAction}
              canDropInto={canDropInto}
              canMoveNode={canMoveNode}
              getDropIntent={getDropIntent}
              onEditDraftChange={onEditDraftChange}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onCreateChildDraftChange={onCreateChildDraftChange}
              onStartCreateChild={onStartCreateChild}
              onSaveCreateChild={onSaveCreateChild}
              onCancelCreateChild={onCancelCreateChild}
              onDelete={onDelete}
              onDrop={onDrop}
              onReorderNode={onReorderNode}
              onSiblingDrop={onSiblingDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragHover={onDragHover}
              onSiblingHover={onSiblingHover}
              onToggleCollapsed={onToggleCollapsed}
            />
            ))}
        </ul>
      )}
    </li>
  );
}
