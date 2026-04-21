"use client";

import CategoriesManager, {
  type CategoryTreeNode,
} from "@/app/(admin)/categories/components/CategoriesManager";
import AdminPageLoading from "@/app/(admin)/components/AdminPageLoading";
import { getCategoriesTree } from "@/lib/api-client/categories";
import { useEffect, useState } from "react";

export default function CategoriesPageClient() {
  const [tree, setTree] = useState<CategoryTreeNode[] | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setTree(null);
    setStatus(null);
    void (async () => {
      const result = await getCategoriesTree();
      if (!active) {
        return;
      }
      if (result.ok) {
        setTree(result.data);
      } else {
        setStatus(result.status);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (tree === null && status === null) {
    return <AdminPageLoading label="Carregando categorias..." />;
  }

  if (status === 401) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Categorias
          </h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente
            para gerenciar categorias.
          </p>
        </div>
      </>
    );
  }

  if (status !== null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Categorias
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar a árvore de categorias (HTTP {status}).
          </p>
        </div>
      </>
    );
  }

  return <CategoriesManager initialTree={tree ?? []} />;
}
