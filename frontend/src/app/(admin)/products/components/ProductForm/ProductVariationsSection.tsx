import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

import type { VariationDraft } from "./form-types";

type Props = {
  variationRows: VariationDraft[];
  onAddVariation: () => void;
  onRemoveVariation: (key: string) => void;
  onUpdateVariation: (
    key: string,
    patch: Partial<Omit<VariationDraft, "key">>,
  ) => void;
};

export function ProductVariationsSection({
  variationRows,
  onAddVariation,
  onRemoveVariation,
  onUpdateVariation,
}: Props) {
  return (
    <div className="mt-8 border-t border-gray-100 pt-6 dark:border-white/[0.05]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">
          Variações
        </h3>
        <Button
          size="sm"
          type="button"
          variant="outline"
          onClick={onAddVariation}
        >
          Adicionar variação
        </Button>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Cada linha precisa de tamanho ou cor (ou ambos). Linhas vazias são
        ignoradas.
      </p>
      <div className="space-y-4">
        {variationRows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.06] sm:grid-cols-12 sm:items-end"
          >
            <div className="sm:col-span-3">
              <Label>Tamanho</Label>
              <Input
                value={row.size}
                onChange={(e) =>
                  onUpdateVariation(row.key, { size: e.target.value })
                }
                placeholder="ex.: M"
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Cor</Label>
              <Input
                value={row.color}
                onChange={(e) =>
                  onUpdateVariation(row.key, { color: e.target.value })
                }
                placeholder="ex.: Preto"
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="0"
                value={String(row.quantity)}
                onChange={(e) =>
                  onUpdateVariation(row.key, {
                    quantity: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex sm:col-span-3 sm:justify-end">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onRemoveVariation(row.key)}
                disabled={variationRows.length <= 1}
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
