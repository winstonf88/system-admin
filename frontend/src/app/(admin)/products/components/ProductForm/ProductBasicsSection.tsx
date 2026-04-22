import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import { PlusIcon } from "@/icons";
import type { ProductSuggestionField } from "@/lib/api-client/products";
import {
  ProductCategoryField,
  type CategorySelectOption,
} from "./ProductCategoryField";

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M10 2.5a.75.75 0 0 1 .69.455l1.42 3.352 3.353 1.421a.75.75 0 0 1 0 1.382l-3.352 1.42-1.421 3.353a.75.75 0 0 1-1.382 0l-1.42-3.352-3.353-1.421a.75.75 0 0 1 0-1.382l3.352-1.42 1.421-3.353A.75.75 0 0 1 10 2.5Z" />
      <path d="M15.5 13.5a.75.75 0 0 1 .69.455l.489 1.155 1.155.49a.75.75 0 0 1 0 1.382l-1.155.489-.49 1.155a.75.75 0 0 1-1.382 0l-.489-1.155-1.155-.49a.75.75 0 0 1 0-1.382l1.155-.489.49-1.155a.75.75 0 0 1 .692-.455Z" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        className="opacity-25"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        className="opacity-90"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  categoryOptions: CategorySelectOption[];
  name: string;
  price: string;
  description: string;
  selectedCategoryIds: number[];
  onNameChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onToggleCategory: (categoryId: number) => void;
  onOpenCategoryModal: () => void;
  onOpenAISuggestions: (field: ProductSuggestionField) => void;
  aiBusy: boolean;
  loadingFields: ProductSuggestionField[];
};

export function ProductBasicsSection({
  categoryOptions,
  name,
  price,
  description,
  selectedCategoryIds,
  onNameChange,
  onPriceChange,
  onDescriptionChange,
  onToggleCategory,
  onOpenCategoryModal,
  onOpenAISuggestions,
  aiBusy,
  loadingFields,
}: Props) {
  const nameLoading = loadingFields.includes("name");
  const descriptionLoading = loadingFields.includes("description");
  const categoryLoading = loadingFields.includes("category");

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
          suffix={
            <button
              type="button"
              aria-label={
                nameLoading
                  ? "Gerando sugestao de nome"
                  : "Sugestao por IA para nome"
              }
              onClick={() => onOpenAISuggestions("name")}
              disabled={aiBusy}
              className="absolute top-1.5 right-1.5 z-30 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              {nameLoading ? (
                <LoadingSpinner className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4 shrink-0" />
              )}
            </button>
          }
        />
      </div>
      <div className="col-span-2 lg:col-span-1">
        <Label htmlFor="product-price">Preço</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400">
            R$
          </span>
          <Input
            id="product-price"
            type="text"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            required
            placeholder="0,00"
            className="pl-11"
          />
        </div>
      </div>
      <div className="col-span-2 lg:col-span-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="product-categories" className="mb-0">
            Categorias
          </Label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCategoryModal}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200/90 bg-brand-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand-800 uppercase transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-brand-800/70 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/60"
            >
              <PlusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Nova categoria
            </button>
            <button
              type="button"
              aria-label={
                categoryLoading
                  ? "Gerando sugestao de categoria"
                  : "Sugestao por IA para categorias"
              }
              onClick={() => onOpenAISuggestions("category")}
              disabled={aiBusy}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              {categoryLoading ? (
                <LoadingSpinner className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4 shrink-0" />
              )}
            </button>
          </div>
        </div>
        <ProductCategoryField
          id="product-categories"
          ariaLabel="Categorias do produto"
          options={categoryOptions}
          selectedCategoryIds={selectedCategoryIds}
          onToggleCategory={onToggleCategory}
          emptyText="Crie uma categoria (botão acima)…"
          lockLastSelected
        />
      </div>
      <div className="col-span-2">
        <Label htmlFor="product-description">Descrição</Label>
        <div className="relative">
          <TextArea
            rows={4}
            value={description}
            onChange={onDescriptionChange}
            placeholder="Opcional"
            className="pr-12"
          />
          <button
            type="button"
            aria-label={
              descriptionLoading
                ? "Gerando sugestao de descricao"
                : "Sugestao por IA para descricao"
            }
            onClick={() => onOpenAISuggestions("description")}
            disabled={aiBusy}
            className="absolute top-1.5 right-1.5 z-30 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            {descriptionLoading ? (
              <LoadingSpinner className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <SparklesIcon className="h-4 w-4 shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
