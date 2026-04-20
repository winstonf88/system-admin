import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import { categoryOptionLabel } from "@/app/(admin)/products/components/category-labels";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";

const categoryModalInner =
  "no-scrollbar relative w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

type Props = {
  isOpen: boolean;
  creatingCategory: boolean;
  categoryList: CategoryOption[];
  newCategoryName: string;
  newCategoryParentId: number | "";
  categoryCreateError: string | null;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onParentIdChange: (value: number | "") => void;
  onSubmit: () => void;
};

export function CreateCategoryModal({
  isOpen,
  creatingCategory,
  categoryList,
  newCategoryName,
  newCategoryParentId,
  categoryCreateError,
  onClose,
  onNameChange,
  onParentIdChange,
  onSubmit,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!creatingCategory) {
          onClose();
        }
      }}
      className="max-w-[560px] m-4"
    >
      <div className={categoryModalInner}>
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Nova categoria
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Ela será adicionada às categorias deste produto assim que for criada. Opcionalmente, defina
            uma categoria pai para montar hierarquias (ex.: Vestuário › Camisetas).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="new-category-name">Nome da categoria</Label>
            <Input
              id="new-category-name"
              value={newCategoryName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex.: Camisetas, Calçados…"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="new-category-parent">Categoria pai (opcional)</Label>
            <select
              id="new-category-parent"
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              value={newCategoryParentId === "" ? "" : String(newCategoryParentId)}
              onChange={(e) => {
                const value = e.target.value;
                onParentIdChange(value === "" ? "" : Number(value));
              }}
              disabled={creatingCategory}
            >
              <option value="">Nenhuma — categoria raiz</option>
              {categoryList.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryOptionLabel(categoryList, category.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoryCreateError && (
          <p className="mx-2 mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {categoryCreateError}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 px-2 lg:mt-10">
          <Button size="sm" variant="outline" type="button" disabled={creatingCategory} onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" type="button" disabled={creatingCategory} onClick={onSubmit}>
            {creatingCategory ? "Criando…" : "Criar e selecionar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
