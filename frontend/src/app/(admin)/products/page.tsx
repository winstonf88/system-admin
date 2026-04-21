import type { Metadata } from "next";

import ProductsList from "@/app/(admin)/products/components/ProductsList";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export const metadata: Metadata = {
  title: "Produtos | System Admin",
  description: "Produtos da sua organização",
};

export const dynamic = "force-dynamic";

type SearchParams = {
  name?: string | string[];
  category_id?: string | string[];
};

type Props = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {};
  const nameValue = Array.isArray(resolvedSearchParams.name)
    ? resolvedSearchParams.name[0]
    : resolvedSearchParams.name;
  const categoryIdValue = Array.isArray(resolvedSearchParams.category_id)
    ? resolvedSearchParams.category_id[0]
    : resolvedSearchParams.category_id;
  const initialNameFilter = nameValue?.trim() ?? "";
  const parsedCategoryId = categoryIdValue ? Number(categoryIdValue) : NaN;
  const initialCategoryFilterId =
    Number.isInteger(parsedCategoryId) && parsedCategoryId > 0
      ? parsedCategoryId
      : null;

  const productsPathParams = new URLSearchParams();
  if (initialNameFilter.length > 0) {
    productsPathParams.set("name", initialNameFilter);
  }
  if (initialCategoryFilterId !== null) {
    productsPathParams.set("category_id", String(initialCategoryFilterId));
  }
  const productsPath = `/api/products/${
    productsPathParams.size > 0 ? `?${productsPathParams.toString()}` : ""
  }`;

  const [productsRes, categoriesRes] = await Promise.all([
    fetchBackendAuthenticated(productsPath),
    fetchBackendAuthenticated("/api/categories/"),
  ]);

  if (productsRes === null) {
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

  if (!productsRes.ok) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Produtos
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar os produtos (HTTP {productsRes.status}).
          </p>
        </div>
      </>
    );
  }

  const products = (await productsRes.json()) as ProductRow[];
  let categories: CategoryOption[] = [];
  if (categoriesRes?.ok) {
    categories = (await categoriesRes.json()) as CategoryOption[];
  }

  return (
    <ProductsList
      products={products}
      categories={categories}
      initialNameFilter={initialNameFilter}
      initialCategoryFilterId={initialCategoryFilterId}
    />
  );
}
