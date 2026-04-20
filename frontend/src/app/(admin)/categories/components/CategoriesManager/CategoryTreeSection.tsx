import type { CategoryTreeNode } from "./types";
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
  getDropIntent: TreeNodeProps["getDropIntent"];
  onEditDraftChange: TreeNodeProps["onEditDraftChange"];
  onStartEdit: TreeNodeProps["onStartEdit"];
  onSaveEdit: TreeNodeProps["onSaveEdit"];
  onCancelEdit: TreeNodeProps["onCancelEdit"];
  onCreateChildDraftChange: TreeNodeProps["onCreateChildDraftChange"];
  onStartCreateChild: TreeNodeProps["onStartCreateChild"];
  onSaveCreateChild: TreeNodeProps["onSaveCreateChild"];
  onCancelCreateChild: TreeNodeProps["onCancelCreateChild"];
  onDelete: TreeNodeProps["onDelete"];
  onDrop: TreeNodeProps["onDrop"];
  onReorderNode: TreeNodeProps["onReorderNode"];
  onSiblingDrop: TreeNodeProps["onSiblingDrop"];
  onDragStart: TreeNodeProps["onDragStart"];
  onDragEnd: TreeNodeProps["onDragEnd"];
  onDragHover: TreeNodeProps["onDragHover"];
  onSiblingHover: TreeNodeProps["onSiblingHover"];
  onToggleCollapsed: TreeNodeProps["onToggleCollapsed"];
  onRootDragLeave: () => void;
  onRootDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onRootDrop: (event: React.DragEvent<HTMLDivElement>) => void;
};

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
  getDropIntent,
  onEditDraftChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
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
  onRootDragLeave,
  onRootDragOver,
  onRootDrop,
}: CategoryTreeSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
      <header className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Árvore de categorias
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Arraste para borda superior/inferior para reordenar irmãos, ou no
          centro de uma categoria para torná-la subcategoria. Use o ícone de
          adicionar para nova subcategoria, ou o lápis para editar o nome.
        </p>
      </header>

      <div className="space-y-4 p-5">
        <div
          className={`rounded-xl border border-dashed px-4 py-3 text-sm transition ${
            hoveredParentId === "root" &&
            draggingId !== null &&
            canDropInto(null, draggingId)
              ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          }`}
          onDragLeave={onRootDragLeave}
          onDragOver={onRootDragOver}
          onDrop={onRootDrop}
        >
          Solte aqui para mover para a raiz
        </div>

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
      </div>
    </section>
  );
}
