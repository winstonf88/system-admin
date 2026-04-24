"use client";

import Switch from "@/components/form/switch/Switch";
import { deleteProduct, updateProduct } from "@/lib/api-client/products";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatProductCategories,
  sortedCategorySelectOptions,
} from "@/app/(admin)/products/components/category-labels";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { backendPublicUrl } from "@/lib/api-public";
import { useModal } from "@/hooks/useModal";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  products: ProductRow[];
  categories: CategoryOption[];
  initialNameFilter?: string;
  initialCategoryFilterId?: number | null;
  isLoading?: boolean;
};

const modalInner =
  "no-scrollbar relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function ProductsList({
  products,
  categories,
  initialNameFilter = "",
  initialCategoryFilterId = null,
  isLoading = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deleteModal = useModal();
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [togglingProductId, setTogglingProductId] = useState<number | null>(null);
  const [rows, setRows] = useState<ProductRow[]>(products);
  const [nameFilter, setNameFilter] = useState(initialNameFilter);
  const [categoryFilterId, setCategoryFilterId] = useState<number | "">(
    initialCategoryFilterId ?? "",
  );

  const categoryOptions = useMemo(
    () => sortedCategorySelectOptions(categories),
    [categories],
  );
  useEffect(() => {
    setRows(products);
  }, [products]);
  const hasActiveFilters =
    nameFilter.trim().length > 0 || categoryFilterId !== "";

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (nameFilter.trim().length > 0) {
      params.set("name", nameFilter.trim());
    }
    if (categoryFilterId !== "") {
      params.set("category_id", String(categoryFilterId));
    }
    const query = params.toString();
    const currentQuery = searchParams.toString();
    if (query === currentQuery) {
      return;
    }
    router.replace(query.length > 0 ? `${pathname}?${query}` : pathname);
  }, [categoryFilterId, nameFilter, pathname, router, searchParams]);

  const openDelete = useCallback(
    (p: ProductRow) => {
      setDeleting(p);
      setDeleteError(null);
      deleteModal.openModal();
    },
    [deleteModal],
  );

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    setDeleteError(null);
    setPending(true);
    try {
      const r = await deleteProduct(deleting.id);
      if (r.ok) {
        deleteModal.closeModal();
        setDeleting(null);
        setRows((prev) => prev.filter((product) => product.id !== deleting.id));
      } else {
        setDeleteError(r.error);
      }
    } finally {
      setPending(false);
    }
  };

  const handleToggleActive = useCallback(async (product: ProductRow) => {
    const nextIsActive = !product.is_active;
    setTogglingProductId(product.id);
    setRows((prev) =>
      prev.map((row) =>
        row.id === product.id ? { ...row, is_active: nextIsActive } : row,
      ),
    );
    try {
      const response = await updateProduct(product.id, {
        name: product.name,
        price: product.price,
        description: product.description,
        is_active: nextIsActive,
        category_ids: product.category_ids,
        variations: product.variations.map((variation) => ({
          size: variation.size,
          color: variation.color,
          quantity: variation.quantity,
        })),
      });
      if (!response.ok) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === product.id ? { ...row, is_active: product.is_active } : row,
          ),
        );
        toast.error(response.error, { duration: 5000 });
        return;
      }
      toast.success(
        nextIsActive ? "Produto ativado com sucesso." : "Produto desativado com sucesso.",
        { duration: 3000 },
      );
    } finally {
      setTogglingProductId((current) => (current === product.id ? null : current));
    }
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <PageBreadCrumb pageTitle="Produtos" />
        <Link
          href="/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          Novo produto
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-4 dark:border-white/[0.05] dark:from-gray-900/80 dark:to-gray-900/20">
          <form
            className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters();
            }}
          >
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Buscar por nome"
              aria-label="Filtrar por nome"
            />
            <select
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              value={categoryFilterId === "" ? "" : String(categoryFilterId)}
              onChange={(e) => {
                const value = e.target.value;
                setCategoryFilterId(value === "" ? "" : Number(value));
              }}
              aria-label="Filtrar por categoria"
            >
              <option value="">Todas as categorias</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={() => {
                setNameFilter("");
                setCategoryFilterId("");
                router.replace(pathname);
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              Limpar
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {rows.length} produto{rows.length === 1 ? "" : "s"}
            {hasActiveFilters ? " encontrado(s) para os filtros atuais" : ""}
          </p>
        </div>
        <div className="relative">
          <div
            className={
              isLoading
                ? "pointer-events-none select-none opacity-70 blur-[1px] transition"
                : "transition"
            }
          >
            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-gray-500 text-theme-sm dark:text-gray-400">
                {hasActiveFilters ? (
                  "Nenhum produto encontrado com os filtros atuais."
                ) : (
                  <>
                    Nenhum produto cadastrado.{" "}
                    <Link
                      href="/products/new"
                      className="font-medium text-brand-500 hover:text-brand-600"
                    >
                      Criar o primeiro
                    </Link>
                  </>
                )}
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <div className="min-w-[880px]">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Imagem
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Nome
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Preço
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Categorias
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Variações
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Status
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-end font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                        >
                          Ações
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                      {rows.map((product) => {
                        const thumb = product.images[0]?.url;
                        const img = backendPublicUrl(thumb);
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="px-5 py-4">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-white/[0.04]">
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- dynamic backend URL
                                  <img
                                    src={img}
                                    alt=""
                                    className="max-h-full max-w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    —
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                              {product.name}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {currencyFormatter.format(product.price)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {formatProductCategories(
                                categories,
                                product.category_ids,
                              )}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                              {product.variations.length}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-start">
                              <Switch
                                label={product.is_active ? "Ativo" : "Inativo"}
                                checked={product.is_active}
                                disabled={togglingProductId === product.id}
                                onChange={() => {
                                  void handleToggleActive(product);
                                }}
                              />
                            </TableCell>
                            <TableCell className="px-5 py-4 text-end">
                              <div className="flex justify-end gap-2">
                                <Link
                                  href={`/products/${product.id}/edit`}
                                  className="inline-flex items-center justify-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                                >
                                  Editar
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openDelete(product)}
                                  className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-theme-xs hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  Excluir
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/45 dark:bg-gray-900/45">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-white/[0.08] dark:bg-gray-900/90 dark:text-gray-200">
                <svg
                  className="size-4 animate-spin text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Carregando...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.closeModal}
        className="max-w-[520px] m-4"
      >
        <div className={modalInner}>
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Excluir produto
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {deleting
                ? `Remover permanentemente “${deleting.name}”? Esta ação não pode ser desfeita.`
                : ""}
            </p>
          </div>
          {deleteError && (
            <p className="mb-4 px-2 text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
          <div className="flex items-center gap-3 px-2 lg:justify-end">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={deleteModal.closeModal}
            >
              Cancelar
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
