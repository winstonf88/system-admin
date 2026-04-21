type CategorySelectOption = { id: number; label: string };

type Props = {
  id?: string;
  ariaLabel: string;
  options: CategorySelectOption[];
  selectedCategoryIds: number[];
  onToggleCategory: (categoryId: number) => void;
  emptyText?: string;
  lockLastSelected?: boolean;
};

export function ProductCategoryField({
  id,
  ariaLabel,
  options,
  selectedCategoryIds,
  onToggleCategory,
  emptyText = "Nenhuma categoria disponível.",
  lockLastSelected = false,
}: Props) {
  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className="mt-1.5 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    >
      {options.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{emptyText}</p>
      ) : (
        options.map((option) => {
          const checked = selectedCategoryIds.includes(option.id);
          const onlyOne =
            lockLastSelected && selectedCategoryIds.length === 1 && checked;
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
  );
}

export type { CategorySelectOption };
