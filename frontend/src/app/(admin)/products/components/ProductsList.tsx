"use client";

import { deleteProductAction } from "@/app/actions/products";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatProductCategories } from "@/app/(admin)/products/components/category-labels";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { backendPublicUrl } from "@/lib/api-public";
import { useModal } from "@/hooks/useModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";

type Props = {
  products: ProductRow[];
  categories: CategoryOption[];
};

const modalInner =
  "no-scrollbar relative w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

export default function ProductsList({ products, categories }: Props) {
  const router = useRouter();
  const deleteModal = useModal();
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      const r = await deleteProductAction(deleting.id);
      if (r.ok) {
        deleteModal.closeModal();
        setDeleting(null);
        router.refresh();
      } else {
        setDeleteError(r.error);
      }
    } finally {
      setPending(false);
    }
  };

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
        {products.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-500 text-theme-sm dark:text-gray-400">
            Nenhum produto cadastrado.{" "}
            <Link
              href="/products/new"
              className="font-medium text-brand-500 hover:text-brand-600"
            >
              Criar o primeiro
            </Link>
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
                      className="px-5 py-3 text-end font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {products.map((product) => {
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
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                          {product.name}
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
