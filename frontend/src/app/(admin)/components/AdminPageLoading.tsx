"use client";

type Props = {
  label?: string;
};

export default function AdminPageLoading({ label = "Carregando..." }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-white/[0.08] dark:bg-gray-900/90 dark:text-gray-200">
          <svg
            className="size-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {label}
        </div>
      </div>
    </div>
  );
}
