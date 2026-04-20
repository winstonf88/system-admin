import type { Metadata } from "next";

import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";
import CategoriesManager, { type CategoryTreeNode } from "./components/CategoriesManager";

export const metadata: Metadata = {
  title: "Categorias | System Admin",
  description: "Gerencie a árvore de categorias dos produtos",
};

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categoriesTreeRes = await fetchBackendAuthenticated("/api/categories/tree");

  if (categoriesTreeRes === null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Categorias</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente para gerenciar categorias.
          </p>
        </div>
      </>
    );
  }

  if (!categoriesTreeRes.ok) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Categorias</h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar a árvore de categorias (HTTP {categoriesTreeRes.status}).
          </p>
        </div>
      </>
    );
  }

  const tree = (await categoriesTreeRes.json()) as CategoryTreeNode[];
  return <CategoriesManager initialTree={tree} />;
}
