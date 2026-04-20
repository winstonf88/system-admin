type CategoryMessagesProps = {
  errorMessage: string | null;
  successMessage: string | null;
};

export function CategoryMessages({
  errorMessage,
  successMessage,
}: CategoryMessagesProps) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        errorMessage
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
      }`}
    >
      {errorMessage ?? successMessage}
    </div>
  );
}
