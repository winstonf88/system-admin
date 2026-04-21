import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import { categoryOptionLabel } from "@/app/(admin)/products/components/category-labels";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type {
  ProductAISuggestions,
  ProductSuggestionField,
} from "@/lib/api-client/products";
import { useEffect, useMemo, useRef, useState } from "react";

const aiModalInner =
  "relative flex h-[680px] max-h-[85vh] w-full max-w-[680px] flex-col rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8";
const optionsListClass =
  "no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-3 pr-2 dark:border-white/[0.08]";
const FIELD_LABELS: Record<ProductSuggestionField, string> = {
  name: "Nome",
  description: "Descricao",
  category: "Categoria",
};

type Props = {
  isOpen: boolean;
  suggestions: ProductAISuggestions | null;
  requestedFields: ProductSuggestionField[];
  categoryList: CategoryOption[];
  applying: boolean;
  refreshing: boolean;
  onRefresh: (fields: ProductSuggestionField[]) => void;
  onClose: () => void;
  onApply: (selected: {
    name?: string;
    description?: string;
    categoryIds?: number[];
  }) => void;
};

export function ProductAISuggestionsModal({
  isOpen,
  suggestions,
  requestedFields,
  categoryList,
  applying,
  refreshing,
  onRefresh,
  onClose,
  onApply,
}: Props) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedDescription, setSelectedDescription] = useState<string | null>(
    null,
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const selectedNameRef = useRef<string | null>(null);
  const selectedDescriptionRef = useRef<string | null>(null);
  const selectedCategoryIdsRef = useRef<number[]>([]);
  const [activeField, setActiveField] = useState<ProductSuggestionField | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedName(null);
    setSelectedDescription(null);
    setSelectedCategoryIds([]);
    selectedNameRef.current = null;
    selectedDescriptionRef.current = null;
    selectedCategoryIdsRef.current = [];
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const firstRequested = requestedFields[0] ?? null;
    setActiveField((prev) => {
      if (prev && requestedFields.includes(prev)) {
        return prev;
      }
      return firstRequested;
    });
  }, [isOpen, requestedFields]);

  useEffect(() => {
    if (!isOpen || !suggestions) {
      return;
    }
    setSelectedName((prev) => {
      if (!requestedFields.includes("name")) {
        selectedNameRef.current = null;
        return null;
      }
      const next =
        prev !== null && suggestions.name.includes(prev) ? prev : null;
      selectedNameRef.current = next;
      return next;
    });
    setSelectedDescription((prev) => {
      if (!requestedFields.includes("description")) {
        selectedDescriptionRef.current = null;
        return null;
      }
      const next =
        prev !== null && suggestions.description.includes(prev) ? prev : null;
      selectedDescriptionRef.current = next;
      return next;
    });
    if (requestedFields.includes("category")) {
      setSelectedCategoryIds((prev) => {
        const suggestedIds = new Set(suggestions.category);
        const next = prev.filter((id) => suggestedIds.has(id));
        selectedCategoryIdsRef.current = next;
        return next;
      });
    } else {
      setSelectedCategoryIds([]);
      selectedCategoryIdsRef.current = [];
    }
  }, [isOpen, requestedFields, suggestions]);

  const suggestedCategoryOptions = useMemo(() => {
    if (!suggestions) {
      return [];
    }

    return Array.from(new Set(suggestions.category))
      .map((id) => ({
        id,
        label: categoryOptionLabel(categoryList, id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt"));
  }, [categoryList, suggestions]);

  const canApply =
    (requestedFields.includes("name") && selectedName !== null) ||
    (requestedFields.includes("description") && selectedDescription !== null) ||
    (requestedFields.includes("category") && selectedCategoryIds.length > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!applying) {
          onClose();
        }
      }}
      className="m-4 max-w-[680px]"
    >
      <div className={aiModalInner}>
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Sugestoes por IA
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Revise e escolha uma opcao para cada campo antes de aplicar no
            formulario.
          </p>
        </div>

        {!suggestions ? null : (
          <div className="flex min-h-0 flex-1 flex-col gap-5 px-2">
            {requestedFields.length > 1 && (
              <div
                className="mb-1 flex flex-wrap gap-2"
                role="tablist"
                aria-label="Campos de sugestao"
              >
                {requestedFields.map((field) => {
                  const isActive = activeField === field;
                  return (
                    <button
                      key={field}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                          : "border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                      }`}
                      onClick={() => setActiveField(field)}
                    >
                      {FIELD_LABELS[field]}
                    </button>
                  );
                })}
              </div>
            )}

            {activeField === "name" && requestedFields.includes("name") && (
              <fieldset className="flex min-h-0 h-full flex-col">
                <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Nome
                </legend>
                <div className={optionsListClass}>
                  {suggestions.name.map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.03]"
                    >
                      <input
                        type="radio"
                        name="ai-name-suggestion"
                        value={value}
                        checked={selectedName === value}
                        onChange={() => {
                          selectedNameRef.current = value;
                          setSelectedName(value);
                        }}
                        className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
                      />
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {activeField === "description" &&
              requestedFields.includes("description") && (
                <fieldset className="flex min-h-0 h-full flex-col">
                  <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Descricao
                  </legend>
                  <div className={optionsListClass}>
                    {suggestions.description.map((value) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.03]"
                      >
                        <input
                          type="radio"
                          name="ai-description-suggestion"
                          value={value}
                          checked={selectedDescription === value}
                          onChange={() => {
                            selectedDescriptionRef.current = value;
                            setSelectedDescription(value);
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
                        />
                        <span>{value}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

            {activeField === "category" &&
              requestedFields.includes("category") && (
                <fieldset className="flex min-h-0 h-full flex-col">
                  <legend className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Categoria
                  </legend>
                  {suggestedCategoryOptions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      Nenhuma categoria sugerida.
                    </p>
                  ) : (
                    <div
                      role="group"
                      aria-label="Categorias sugeridas por IA"
                      className={optionsListClass}
                    >
                      {suggestedCategoryOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-200 dark:hover:bg-white/[0.03]"
                        >
                          <input
                            type="checkbox"
                            name="ai-category-suggestion"
                            value={option.id}
                            checked={selectedCategoryIds.includes(option.id)}
                            onChange={() => {
                              setSelectedCategoryIds((prev) => {
                                const next = prev.includes(option.id)
                                  ? prev.filter((id) => id !== option.id)
                                  : [...prev, option.id].sort((a, b) => a - b);
                                selectedCategoryIdsRef.current = next;
                                return next;
                              });
                            }}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 px-2">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={applying || refreshing}
            onClick={() => {
              if (activeField) {
                onRefresh([activeField]);
                return;
              }
              onRefresh(requestedFields);
            }}
          >
            {refreshing ? "Atualizando..." : "Atualizar sugestões"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={applying || refreshing}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            type="button"
            disabled={!canApply || applying || refreshing}
            onClick={() => {
              if (!canApply) {
                return;
              }
              const checkedName = (
                document.querySelector(
                  'input[name="ai-name-suggestion"]:checked',
                ) as HTMLInputElement | null
              )?.value;
              const checkedDescription = (
                document.querySelector(
                  'input[name="ai-description-suggestion"]:checked',
                ) as HTMLInputElement | null
              )?.value;
              onApply({
                name:
                  selectedNameRef.current ??
                  selectedName ??
                  checkedName ??
                  undefined,
                description:
                  selectedDescriptionRef.current ??
                  selectedDescription ??
                  checkedDescription ??
                  undefined,
                categoryIds:
                  selectedCategoryIdsRef.current.length > 0
                    ? selectedCategoryIdsRef.current
                    : undefined,
              });
            }}
          >
            {applying ? "Aplicando..." : "Salvar/atualizar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
