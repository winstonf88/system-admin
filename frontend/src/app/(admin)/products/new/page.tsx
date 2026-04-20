import type { Metadata } from "next";

import ProductForm from "@/app/(admin)/products/components/ProductForm";
import type { CategoryOption } from "@/app/(admin)/products/components/product-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export const metadata: Metadata = {
  title: "Novo produto | System Admin",
  description: "Cadastrar um novo produto",
};

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const catRes = await fetchBackendAuthenticated("/api/categories/");

  if (catRes === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">
          Sua sessão não inclui credenciais de API. Saia e entre novamente.
        </p>
      </div>
    );
  }

  if (!catRes.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar as categorias (HTTP {catRes.status}).
        </p>
      </div>
    );
  }

  const categories = (await catRes.json()) as CategoryOption[];

  return <ProductForm categories={categories} mode="create" />;
}
