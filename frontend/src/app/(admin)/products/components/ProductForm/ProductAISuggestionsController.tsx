import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import type {
  ProductAISuggestions,
  ProductSuggestionField,
} from "@/lib/api-client/products";
import { suggestProductFields } from "@/lib/api-client/products";
import { useState } from "react";

import { ProductAISuggestionsModal } from "./ProductAISuggestionsModal";

type SelectedSuggestions = {
  name?: string;
  description?: string;
  categoryIds?: number[];
};

type Props = {
  busy: boolean;
  categoryList: CategoryOption[];
  pendingFiles: File[];
  savedImageIds: number[];
  onApply: (selected: SelectedSuggestions) => void;
  onError: (message: string | null) => void;
  children: (controls: {
    openSuggestions: (fields: ProductSuggestionField[]) => Promise<void>;
    aiBusy: boolean;
    loadingFields: ProductSuggestionField[];
  }) => React.ReactNode;
};

export function ProductAISuggestionsController({
  busy,
  categoryList,
  pendingFiles,
  savedImageIds,
  onApply,
  onError,
  children,
}: Props) {
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false);
  const [aiSuggestionsModalOpen, setAiSuggestionsModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    name: string[];
    description: string[];
    category: number[];
  } | null>(null);
  const [requestedFields, setRequestedFields] = useState<
    ProductSuggestionField[]
  >([]);
  const [loadingFields, setLoadingFields] = useState<ProductSuggestionField[]>(
    [],
  );

  const fetchSuggestions = async (
    fields: ProductSuggestionField[],
  ): Promise<ProductAISuggestions | null> => {
    if (loadingAISuggestions || busy) {
      return null;
    }
    if (pendingFiles.length === 0 && savedImageIds.length === 0) {
      onError("Adicione ao menos uma imagem para gerar sugestões por IA.");
      return null;
    }

    onError(null);
    setLoadingAISuggestions(true);
    try {
      const uniqueFields = Array.from(new Set(fields));
      if (uniqueFields.length === 0) {
        onError("Selecione ao menos um campo para sugerir.");
        return null;
      }
      setLoadingFields(uniqueFields);
      const response = await suggestProductFields({
        files: pendingFiles,
        productImageIds: savedImageIds,
        fields: uniqueFields,
      });
      if (!response.ok) {
        onError(response.error);
        return null;
      }
      for (const field of uniqueFields) {
        if (response.suggestions[field].length === 0) {
          onError(
            "A IA não retornou sugestões para o campo solicitado. Tente novamente com outras imagens.",
          );
          return null;
        }
      }
      return response.suggestions;
    } finally {
      setLoadingAISuggestions(false);
      setLoadingFields([]);
    }
  };

  const openSuggestions = async (fields: ProductSuggestionField[]) => {
    const uniqueFields = Array.from(new Set(fields));
    const fresh = await fetchSuggestions(uniqueFields);
    if (!fresh) {
      return;
    }
    setRequestedFields(uniqueFields);
    setAiSuggestions(fresh);
    setAiSuggestionsModalOpen(true);
  };

  const refreshSuggestions = async (fields: ProductSuggestionField[]) => {
    const uniqueFields = Array.from(new Set(fields));
    if (uniqueFields.length === 0) {
      return;
    }
    const fresh = await fetchSuggestions(uniqueFields);
    if (!fresh) {
      return;
    }
    setAiSuggestions((prev) => {
      const base: ProductAISuggestions = prev ?? {
        name: [],
        description: [],
        category: [],
      };
      const next: ProductAISuggestions = { ...base };
      for (const field of uniqueFields) {
        if (field === "name") {
          next.name = fresh.name;
          continue;
        }
        if (field === "description") {
          next.description = fresh.description;
          continue;
        }
        next.category = fresh.category;
      }
      return next;
    });
  };

  const aiBusy = loadingAISuggestions || busy;

  return (
    <>
      {children({ openSuggestions, aiBusy, loadingFields })}
      <ProductAISuggestionsModal
        isOpen={aiSuggestionsModalOpen}
        suggestions={aiSuggestions}
        requestedFields={requestedFields}
        categoryList={categoryList}
        applying={false}
        refreshing={loadingAISuggestions}
        onRefresh={(fields) => {
          void refreshSuggestions(fields);
        }}
        onClose={() => {
          setAiSuggestionsModalOpen(false);
        }}
        onApply={(selected) => {
          onApply(selected);
          setAiSuggestionsModalOpen(false);
        }}
      />
    </>
  );
}
