import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { PlusIcon } from "@/icons";

type CategorySelectOption = { id: number; label: string };

type Props = {
  categoryList: CategoryOption[];
  categoryOptions: CategorySelectOption[];
  name: string;
  description: string;
  selectedCategoryIds: number[];
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onOpenCategoryModal: () => void;
};

export function ProductBasicsSection({
  categoryList,
  categoryOptions,
  name,
  description,
  selectedCategoryIds,
  onNameChange,
  onDescriptionChange,
  onToggleCategory,
  onOpenCategoryModal,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
      <div className="col-span-2 lg:col-span-1">
        <Label htmlFor="product-name">Nome</Label>
        <Input
          id="product-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          minLength={1}
        />
      </div>
      <div className="col-span-2 lg:col-span-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="product-categories" className="mb-0">
            Categorias
          </Label>
          <button
            type="button"
            onClick={onOpenCategoryModal}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200/90 bg-brand-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand-800 uppercase transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-brand-800/70 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/60"
          >
            <PlusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Nova categoria
          </button>
        </div>
        <div
          id="product-categories"
          role="group"
          aria-label="Categorias do produto"
          className="mt-1.5 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {categoryList.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">
              Crie uma categoria (botão acima)…
            </p>
          ) : (
            categoryOptions.map((option) => {
              const checked = selectedCategoryIds.includes(option.id);
              const onlyOne = selectedCategoryIds.length === 1 && checked;
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md py-0.5 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900"
                    checked={checked}
                    disabled={onlyOne}
                    onChange={() => onToggleCategory(option.id)}
                  />
                  <span className="leading-snug">{option.label}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
      <div className="col-span-2">
        <Label htmlFor="product-description">Descrição</Label>
        <TextArea
          rows={4}
          value={description}
          onChange={onDescriptionChange}
          placeholder="Opcional"
        />
      </div>
    </div>
  );
}
