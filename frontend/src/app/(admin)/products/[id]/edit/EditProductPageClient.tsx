"use client";

import ProductForm from "@/app/(admin)/products/components/ProductForm";
import AdminPageLoading from "@/app/(admin)/components/AdminPageLoading";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { getProduct, getProductCategories } from "@/lib/api-client/products";
import { useEffect, useState } from "react";

type Props = {
  productId: number;
};

export default function EditProductPageClient({ productId }: Props) {
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [categories, setCategories] = useState<CategoryOption[] | null>(null);
  const [productStatus, setProductStatus] = useState<number | null>(null);
  const [categoriesStatus, setCategoriesStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setProduct(null);
    setCategories(null);
    setProductStatus(null);
    setCategoriesStatus(null);

    void (async () => {
      const [productResult, categoriesResult] = await Promise.all([
        getProduct(productId),
        getProductCategories(),
      ]);
      if (!active) {
        return;
      }

      if (productResult.ok) {
        setProduct(productResult.data);
      } else {
        setProductStatus(productResult.status);
      }

      if (categoriesResult.ok) {
        setCategories(categoriesResult.data);
      } else {
        setCategoriesStatus(categoriesResult.status);
      }
    })();

    return () => {
      active = false;
    };
  }, [productId]);

  if (product === null && productStatus === null) {
    return <AdminPageLoading label="Carregando produto..." />;
  }

  if (productStatus === 401 || categoriesStatus === 401) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">
          Sua sessão não inclui credenciais de API. Saia e entre novamente.
        </p>
      </div>
    );
  }

  if (productStatus === 404) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Produto não encontrado.
        </p>
      </div>
    );
  }

  if (productStatus !== null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar o produto (HTTP {productStatus}).
        </p>
      </div>
    );
  }

  if (categoriesStatus !== null || categories === null) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          Não foi possível carregar as categorias (HTTP{" "}
          {categoriesStatus ?? 500}).
        </p>
      </div>
    );
  }

  return <ProductForm categories={categories} mode="edit" product={product!} />;
}
