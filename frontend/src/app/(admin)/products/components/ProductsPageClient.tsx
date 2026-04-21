"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import ProductsList from "@/app/(admin)/products/components/ProductsList";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import {
  getProductCategories,
  getProducts,
} from "@/lib/api-client/products";

export default function ProductsPageClient() {
  const searchParams = useSearchParams();
  const nameFilter = searchParams.get("name")?.trim() ?? "";
  const categoryParam = searchParams.get("category_id");
  const parsedCategoryId = categoryParam ? Number(categoryParam) : NaN;
  const categoryId =
    Number.isInteger(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null;

  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [productsStatus, setProductsStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setProducts(null);
    setProductsStatus(null);

    void (async () => {
      const [productsResult, categoriesResult] = await Promise.all([
        getProducts({ name: nameFilter, categoryId }),
        getProductCategories(),
      ]);
      if (!active) {
        return;
      }
      if (productsResult.ok) {
        setProducts(productsResult.data);
      } else {
        setProductsStatus(productsResult.status);
      }
      if (categoriesResult.ok) {
        setCategories(categoriesResult.data);
      } else {
        setCategories([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [nameFilter, categoryId]);

  const listKey = useMemo(
    () => `${nameFilter}::${categoryId ?? "none"}`,
    [nameFilter, categoryId],
  );

  if (products === null && productsStatus === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Carregando produtos...</p>
      </div>
    );
  }

  if (productsStatus === 401) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Produtos
          </h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente para
            ver os produtos.
          </p>
        </div>
      </>
    );
  }

  if (productsStatus !== null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Produtos
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar os produtos (HTTP {productsStatus}).
          </p>
        </div>
      </>
    );
  }

  return (
    <ProductsList
      key={listKey}
      products={products ?? []}
      categories={categories}
      initialNameFilter={nameFilter}
      initialCategoryFilterId={categoryId}
    />
  );
}
