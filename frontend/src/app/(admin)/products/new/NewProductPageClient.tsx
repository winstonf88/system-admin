"use client";

import ProductForm from "@/app/(admin)/products/components/ProductForm";
import AdminPageLoading from "@/app/(admin)/components/AdminPageLoading";
import { getProductCategories } from "@/lib/api-client/products";
import { useEffect, useState } from "react";
import type { CategoryOption } from "@/app/(admin)/products/components/product-types";

export default function NewProductPageClient() {
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setCategories(null);
    setStatus(null);
    void (async () => {
      const result = await getProductCategories();
      if (!active) {
        return;
      }
      if (result.ok) {
        setCategories(result.data);
      } else {
        setStatus(result.status);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (categories === null && status === null) {
    return <AdminPageLoading label="Carregando categorias..." />;
  }

  if (status === 401) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">
          Sua sessão não inclui credenciais de API. Saia e entre novamente.
        </p>
      </div>
    );
  }

  if (status !== null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar as categorias (HTTP {status}).
        </p>
      </div>
    );
  }

  return <ProductForm categories={categories ?? []} mode="create" />;
}
