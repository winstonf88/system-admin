"use client";

import { useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import Button from "@/components/ui/button/Button";
import { PlusIcon } from "@/icons";

import type { CategoryTreeNode } from "./types";
import { CATEGORY_DROP_ROOT, parseCategoryDragId } from "./category-dnd-ids";
import { SavingSpinner } from "./SavingSpinner";
import { TreeNode, type TreeNodeProps } from "./TreeNode";

type CategoryTreeSectionProps = {
  tree: CategoryTreeNode[];
  editingId: number | null;
  editDraftName: string;
  creatingChildUnderId: number | null;
  createChildDraftName: string;
  collapsedIds: Set<number>;
  draggingId: number | null;
  hoveredParentId: number | "root" | null;
  hoveredSiblingDrop: TreeNodeProps["hoveredSiblingDrop"];
  pendingAction: boolean;
  canDropInto: TreeNodeProps["canDropInto"];
  getDropZoneEnabled: TreeNodeProps["getDropZoneEnabled"];
  dragOverlayLabel: string | null;
  creatingRoot: boolean;
  onStartCreateRoot: () => void;
  onSaveCreateRoot: () => void | Promise<void>;
  onCancelCreateRoot: () => void;
  onEditDraftChange: TreeNodeProps["onEditDraftChange"];
  onStartEdit: TreeNodeProps["onStartEdit"];
  onSaveEdit: TreeNodeProps["onSaveEdit"];
  onCancelEdit: TreeNodeProps["onCancelEdit"];
  onCreateChildDraftChange: TreeNodeProps["onCreateChildDraftChange"];
  onStartCreateChild: TreeNodeProps["onStartCreateChild"];
  onSaveCreateChild: TreeNodeProps["onSaveCreateChild"];
  onCancelCreateChild: TreeNodeProps["onCancelCreateChild"];
  onDelete: TreeNodeProps["onDelete"];
  onToggleActive: TreeNodeProps["onToggleActive"];
  onToggleCollapsed: TreeNodeProps["onToggleCollapsed"];
  onDndDragStart: (event: DragStartEvent) => void;
  onDndDragOver: (event: DragOverEvent) => void;
  onDndDragEnd: (event: DragEndEvent) => void;
  onDndDragCancel: () => void;
};

function CategoryRootDropZone({
  canDropInto,
}: {
  canDropInto: (targetParentId: number | null, draggedId: number) => boolean;
}) {
  const { active } = useDndContext();
  const draggedId = active ? parseCategoryDragId(String(active.id)) : null;
  const rootAllowed = draggedId !== null && canDropInto(null, draggedId);
  const { setNodeRef, isOver } = useDroppable({
    id: CATEGORY_DROP_ROOT,
    disabled: active === null || !rootAllowed,
  });
  const highlight = isOver && rootAllowed;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-dashed px-4 py-3 text-sm transition ${
        highlight
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
          : "border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
      }`}
    >
      Solte aqui para mover para a raiz
    </div>
  );
}

export function CategoryTreeSection({
  tree,
  editingId,
  editDraftName,
  creatingChildUnderId,
  createChildDraftName,
  collapsedIds,
  draggingId,
  hoveredParentId,
  hoveredSiblingDrop,
  pendingAction,
  canDropInto,
  getDropZoneEnabled,
  dragOverlayLabel,
  creatingRoot,
  onStartCreateRoot,
  onSaveCreateRoot,
  onCancelCreateRoot,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onCreateChildDraftChange,
  onStartCreateChild,
  onSaveCreateChild,
  onCancelCreateChild,
  onDelete,
  onToggleActive,
  onToggleCollapsed,
  onDndDragStart,
  onDndDragOver,
  onDndDragEnd,
  onDndDragCancel,
}: CategoryTreeSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    if (!creatingRoot) {
      return;
    }
    const el = document.getElementById(
      "category-create-root",
    ) as HTMLInputElement | null;
    el?.focus();
  }, [creatingRoot]);

  const isSavingRoot = pendingAction && creatingRoot;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]"
      aria-busy={pendingAction}
    >
      <header className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Árvore de categorias
              </h3>
              {pendingAction ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/90 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
                  <SavingSpinner className="size-3.5" />
                  Salvando…
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Use o ícone ⋮ para arrastar. Solte na borda superior/inferior da
              linha para reordenar irmãos, ou na faixa central para tornar
              subcategoria. O ícone + cria subcategoria; o lápis edita o nome.
              Use &quot;Nova Categoria&quot; para adicionar uma categoria de
              topo.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartCreateRoot}
            disabled={
              pendingAction ||
              creatingRoot ||
              creatingChildUnderId !== null ||
              editingId !== null
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-700 shadow-theme-xs transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/40 dark:bg-gray-900 dark:text-brand-300 dark:hover:bg-brand-500/10"
            aria-label="Nova categoria na raiz"
            title="Nova categoria na raiz"
          >
            <PlusIcon
              width={16}
              height={16}
              className="pointer-events-none shrink-0"
              aria-hidden
            />
            Nova Categoria
          </button>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <DndContext
          id="category-tree-dnd"
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={onDndDragStart}
          onDragOver={onDndDragOver}
          onDragEnd={onDndDragEnd}
          onDragCancel={onDndDragCancel}
        >
          <CategoryRootDropZone canDropInto={canDropInto} />

          {creatingRoot ? (
            <div className="flex flex-wrap items-center gap-2 overflow-visible rounded-xl border border-dashed border-brand-300 bg-brand-50/50 px-3 py-2 dark:border-brand-500/50 dark:bg-brand-500/10">
              <input
                id="category-create-root"
                type="text"
                value={createChildDraftName}
                onChange={(event) =>
                  onCreateChildDraftChange(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void onSaveCreateRoot();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelCreateRoot();
                  }
                }}
                placeholder="Nome da categoria na raiz"
                autoComplete="off"
                className="h-9 min-w-[8rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  disabled={pendingAction}
                  aria-busy={isSavingRoot}
                  startIcon={
                    isSavingRoot ? (
                      <SavingSpinner className="size-3.5" />
                    ) : undefined
                  }
                  onClick={() => void onSaveCreateRoot()}
                >
                  {isSavingRoot ? "Salvando…" : "Salvar"}
                </Button>
                <button
                  type="button"
                  disabled={pendingAction}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onCancelCreateRoot()}
                  className="rounded-md px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200/80 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {tree.length === 0 && !creatingRoot ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center dark:border-white/[0.08] dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nenhuma categoria cadastrada ainda.
              </p>
              <button
                type="button"
                onClick={onStartCreateRoot}
                disabled={
                  pendingAction ||
                  creatingChildUnderId !== null ||
                  editingId !== null
                }
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-theme-xs transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/40 dark:bg-gray-950 dark:text-brand-300 dark:hover:bg-brand-500/10"
              >
                <PlusIcon
                  width={16}
                  height={16}
                  className="pointer-events-none shrink-0"
                  aria-hidden
                />
                Adicionar categoria na raiz
              </button>
            </div>
          ) : null}

          {tree.length > 0 ? (
            <ul className="space-y-6">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
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
          ) : null}

          <DragOverlay dropAnimation={null}>
            {dragOverlayLabel ? (
              <div className="max-w-sm rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-xl dark:border-brand-500/40 dark:bg-gray-900 dark:text-white/90">
                {dragOverlayLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
