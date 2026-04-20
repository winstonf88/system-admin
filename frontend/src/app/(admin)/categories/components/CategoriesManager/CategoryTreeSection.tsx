"use client";

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

import type { CategoryTreeNode } from "./types";
import { CATEGORY_DROP_ROOT, parseCategoryDragId } from "./category-dnd-ids";
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
  canMoveNode: TreeNodeProps["canMoveNode"];
  getDropZoneEnabled: TreeNodeProps["getDropZoneEnabled"];
  dragOverlayLabel: string | null;
  onEditDraftChange: TreeNodeProps["onEditDraftChange"];
  onStartEdit: TreeNodeProps["onStartEdit"];
  onSaveEdit: TreeNodeProps["onSaveEdit"];
  onCancelEdit: TreeNodeProps["onCancelEdit"];
  onCreateChildDraftChange: TreeNodeProps["onCreateChildDraftChange"];
  onStartCreateChild: TreeNodeProps["onStartCreateChild"];
  onSaveCreateChild: TreeNodeProps["onSaveCreateChild"];
  onCancelCreateChild: TreeNodeProps["onCancelCreateChild"];
  onDelete: TreeNodeProps["onDelete"];
  onReorderNode: TreeNodeProps["onReorderNode"];
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
  canMoveNode,
  getDropZoneEnabled,
  dragOverlayLabel,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onCreateChildDraftChange,
  onStartCreateChild,
  onSaveCreateChild,
  onCancelCreateChild,
  onDelete,
  onReorderNode,
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

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <header className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Árvore de categorias
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Use o ícone ⋮ para arrastar. Solte na borda superior/inferior da linha
          para reordenar irmãos, ou na faixa central para tornar subcategoria. O
          ícone + cria subcategoria; o lápis edita o nome.
        </p>
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

          {tree.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-400">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
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
                  onReorderNode={onReorderNode}
                  onToggleCollapsed={onToggleCollapsed}
                />
              ))}
            </ul>
          )}

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
