"use client";

import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import ProductsList from "@/app/(admin)/products/components/ProductsList";
import { getProductCategories, getProducts } from "@/lib/api-client/products";

export default function ProductsPageClient() {
  const searchParams = useSearchParams();
  const nameFilter = searchParams.get("name")?.trim() ?? "";
  const categoryParam = searchParams.get("category_id");
  const parsedCategoryId = categoryParam ? Number(categoryParam) : NaN;
  const categoryId =
    Number.isInteger(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null;

  const productsQuery = useQuery({
    queryKey: ["products", nameFilter, categoryId],
    queryFn: () => getProducts({ name: nameFilter, categoryId }),
    placeholderData: keepPreviousData,
  });

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: getProductCategories,
    staleTime: 5 * 60 * 1000,
  });

  const products = productsQuery.data?.ok ? productsQuery.data.data : [];
  const categories = categoriesQuery.data?.ok ? categoriesQuery.data.data : [];
  const productsStatus =
    productsQuery.data && !productsQuery.data.ok
      ? productsQuery.data.status
      : null;
  const listKey = `${nameFilter}::${categoryId ?? "none"}`;

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
            Sua sessão não inclui credenciais de API. Saia e entre novamente
            para ver os produtos.
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
      products={products}
      categories={categories}
      initialNameFilter={nameFilter}
      initialCategoryFilterId={categoryId}
      isLoading={productsQuery.isFetching}
    />
  );
}
