import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductForm from "@/app/(admin)/products/components/ProductForm";
import type { CategoryOption, ProductRow } from "@/app/(admin)/products/components/product-types";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Editar produto #${id} | System Admin`,
  };
}

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }

  const [productRes, categoriesRes] = await Promise.all([
    fetchBackendAuthenticated(`/api/products/${id}`),
    fetchBackendAuthenticated("/api/categories/"),
  ]);

  if (productRes === null || categoriesRes === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">
          Sua sessão não inclui credenciais de API. Saia e entre novamente.
        </p>
      </div>
    );
  }

  if (productRes.status === 404) {
    notFound();
  }

  if (!productRes.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar o produto (HTTP {productRes.status}).
        </p>
      </div>
    );
  }

  if (!categoriesRes.ok) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar as categorias (HTTP {categoriesRes.status}).
        </p>
      </div>
    );
  }

  const product = (await productRes.json()) as ProductRow;
  const categories = (await categoriesRes.json()) as CategoryOption[];

  return <ProductForm categories={categories} mode="edit" product={product} />;
}
