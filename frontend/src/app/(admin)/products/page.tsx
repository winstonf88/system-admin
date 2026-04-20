import type { Metadata } from "next";

import ProductsList from "@/components/products/ProductsList";
import type { CategoryOption, ProductRow } from "@/components/products/product-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export const metadata: Metadata = {
  title: "Produtos | System Admin",
  description: "Produtos da sua organização",
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [productsRes, categoriesRes] = await Promise.all([
    fetchBackendAuthenticated("/api/products/"),
    fetchBackendAuthenticated("/api/categories/"),
  ]);

  if (productsRes === null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Produtos</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente para ver os produtos.
          </p>
        </div>
      </>
    );
  }

  if (!productsRes.ok) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Produtos</h2>
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

  return <ProductsList products={products} categories={categories} />;
}
