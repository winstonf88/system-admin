"use client";

import { createCategoryAction } from "@/app/actions/categories";
import {
  createProductAction,
  updateProductAction,
  uploadProductImageAction,
} from "@/app/actions/products";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import type { CategoryOption, ProductRow } from "@/components/products/product-types";
import {
  categoryOptionLabel,
  sortedCategorySelectOptions,
} from "@/components/products/category-labels";
import { PlusIcon } from "@/icons";
import { backendPublicUrl } from "@/lib/api-public";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

type VariationDraft = { key: string; size: string; color: string; quantity: number };

function buildVariations(rows: VariationDraft[]) {
  return rows
    .filter((r) => r.size.trim() || r.color.trim())
    .map((r) => ({
      size: r.size.trim() || null,
      color: r.color.trim() || null,
      quantity: Math.max(0, Number(r.quantity) || 0),
    }));
}

type Props = {
  categories: CategoryOption[];
  mode: "create" | "edit";
  product?: ProductRow;
};

const categoryModalInner =
  "no-scrollbar relative w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

export default function ProductForm({ categories, mode, product }: Props) {
  const router = useRouter();
  const {
    isOpen: isCategoryModalOpen,
    openModal: openCategoryModal,
    closeModal: closeCategoryModalBase,
  } = useModal(categories.length === 0);

  /** Categories created in this session before the next full server refresh (merged with `categories`). */
  const [localCategories, setLocalCategories] = useState<CategoryOption[]>([]);
  const categoryList = useMemo(() => {
    const byId = new Map<number, CategoryOption>();
    for (const c of categories) {
      byId.set(c.id, c);
    }
    for (const c of localCategories) {
      byId.set(c.id, c);
    }
    return Array.from(byId.values());
  }, [categories, localCategories]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | "">("");
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState<number>(() => {
    if (product?.category_id != null) {
      return product.category_id;
    }
    return categories[0]?.id ?? 0;
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [variationRows, setVariationRows] = useState<VariationDraft[]>(() => {
    if (product?.variations?.length) {
      return product.variations.map((v) => ({
        key: `v-${v.id}`,
        size: v.size ?? "",
        color: v.color ?? "",
        quantity: v.quantity,
      }));
    }
    return [{ key: crypto.randomUUID(), size: "", color: "", quantity: 0 }];
  });

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const closeCategoryModal = () => {
    setCategoryCreateError(null);
    setNewCategoryName("");
    setNewCategoryParentId("");
    closeCategoryModalBase();
  };

  const blobPreviewUrl = useMemo(() => {
    if (!pendingFile) {
      return null;
    }
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (blobPreviewUrl) {
        URL.revokeObjectURL(blobPreviewUrl);
      }
    };
  }, [blobPreviewUrl]);

  const categoryOptions = sortedCategorySelectOptions(categoryList);

  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (trimmed.length < 1) {
      setCategoryCreateError("Informe o nome da categoria.");
      return;
    }
    setCategoryCreateError(null);
    setCreatingCategory(true);
    try {
      const r = await createCategoryAction({
        name: trimmed,
        parent_id: newCategoryParentId === "" ? null : Number(newCategoryParentId),
      });
      if (!r.ok) {
        setCategoryCreateError(r.error);
        return;
      }
      setLocalCategories((prev) => [...prev, r.category]);
      setCategoryId(r.category.id);
      setError(null);
      closeCategoryModal();
      router.refresh();
    } finally {
      setCreatingCategory(false);
    }
  };
  const displayImageSrc =
    blobPreviewUrl ?? backendPublicUrl(product?.image_url ?? null);

  const onImageDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setError(null);
      setPendingFile(file);
    }
  }, []);

  const onImageDropRejected = useCallback(() => {
    setError("Envie apenas arquivos de imagem (por exemplo PNG ou JPG).");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onImageDrop,
    onDropRejected: onImageDropRejected,
    accept: { "image/*": [] },
    maxFiles: 1,
    multiple: false,
  });

  const clearPendingImage = () => {
    setError(null);
    setPendingFile(null);
  };

  const addVariation = () => {
    setVariationRows((rows) => [
      ...rows,
      { key: crypto.randomUUID(), size: "", color: "", quantity: 0 },
    ]);
  };

  const removeVariation = (key: string) => {
    setVariationRows((rows) => rows.filter((r) => r.key !== key));
  };

  const updateVariation = (key: string, patch: Partial<Omit<VariationDraft, "key">>) => {
    setVariationRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryList.length) {
      setError('É necessário ter pelo menos uma categoria. Clique em “Nova categoria”.');
      return;
    }

    const vars = buildVariations(variationRows);
    for (const v of vars) {
      if (!v.size && !v.color) {
        setError("Cada variação precisa de tamanho ou cor (ou ambos).");
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "create") {
        const r = await createProductAction({
          name,
          description: description.trim() || null,
          category_id: categoryId,
          image_url: null,
          variations: vars,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        if (pendingFile) {
          const fd = new FormData();
          fd.append("file", pendingFile);
          const up = await uploadProductImageAction(r.id, fd);
          if (!up.ok) {
            setError(up.error);
            return;
          }
        }
        router.push("/products");
        router.refresh();
        return;
      }

      if (product) {
        const r = await updateProductAction(product.id, {
          name,
          description: description.trim() || null,
          category_id: categoryId,
          image_url: product.image_url,
          variations: vars,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        if (pendingFile) {
          const fd = new FormData();
          fd.append("file", pendingFile);
          const up = await uploadProductImageAction(product.id, fd);
          if (!up.ok) {
            setError(up.error);
            return;
          }
        }
        router.push("/products");
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  const pageTitle = mode === "create" ? "Novo produto" : "Editar produto";

  return (
    <>
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div>
        <Link
          href="/products"
          className="mb-3 inline-block text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          ← Voltar aos produtos
        </Link>
        <PageBreadCrumb pageTitle={pageTitle} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {categoryList.length === 0 && (
          <div
            className="mb-6 rounded-2xl border border-dashed border-brand-400/35 bg-linear-to-br from-brand-50/90 to-white px-4 py-3.5 text-sm text-gray-700 shadow-sm dark:border-brand-700/40 dark:from-brand-950/50 dark:to-gray-900/80 dark:text-gray-300"
            role="status"
          >
            <span className="font-semibold text-gray-900 dark:text-white">Comece por uma categoria.</span>{" "}
            Abra <strong className="font-semibold">Nova categoria</strong> para cadastrar; a categoria será
            selecionada automaticamente para este produto.
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <div className="col-span-2 lg:col-span-1">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
            />
          </div>
          <div className="col-span-2 lg:col-span-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="product-category" className="mb-0">
                Categoria
              </Label>
              <button
                type="button"
                onClick={() => {
                  setCategoryCreateError(null);
                  openCategoryModal();
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand-200/90 bg-brand-50 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand-800 uppercase transition hover:border-brand-300 hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-brand-800/70 dark:bg-brand-950/50 dark:text-brand-200 dark:hover:bg-brand-900/60"
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Nova categoria
              </button>
            </div>
            <select
              id="product-category"
              className="mt-1.5 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              value={categoryList.length ? categoryId : ""}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              required={categoryList.length > 0}
              disabled={!categoryList.length}
            >
              {categoryList.length === 0 ? (
                <option value="">Crie uma categoria (botão acima)…</option>
              ) : (
                categoryOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="product-description">Descrição</Label>
            <TextArea
              rows={4}
              value={description}
              onChange={(v) => setDescription(v)}
              placeholder="Opcional"
            />
          </div>

          <div className="col-span-2">
            <Label>Imagem</Label>
            <div
              {...getRootProps({
                className: `cursor-pointer rounded-xl border border-dashed border-gray-300 p-7 transition dark:border-gray-700 lg:p-10 ${
                  isDragActive
                    ? "border-brand-500 bg-brand-50 dark:bg-gray-800"
                    : "border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
                }`,
              })}
            >
              <input {...getInputProps()} />
              <div className="dz-message m-0 flex flex-col items-center text-center">
                <div className="mb-[22px] flex justify-center">
                  <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                    <svg
                      className="fill-current"
                      width="29"
                      height="28"
                      viewBox="0 0 29 28"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                      />
                    </svg>
                  </div>
                </div>
                <h4 className="mb-3 text-center text-theme-xl font-semibold text-gray-800 dark:text-white/90">
                  {isDragActive ? "Solte a imagem aqui" : "Arraste imagens para cá"}
                </h4>
                <span className="mb-5 block w-full max-w-[320px] text-sm text-gray-700 dark:text-gray-400">
                  PNG, JPG, WebP e outros formatos de imagem — ou clique para escolher um arquivo
                </span>
                <span className="text-theme-sm font-medium text-brand-500 underline">
                  Procurar arquivo
                </span>
                {pendingFile && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                    Selecionado: <span className="font-medium">{pendingFile.name}</span>
                  </p>
                )}
              </div>
            </div>
            {pendingFile && (
              <div className="mt-3">
                <Button size="sm" type="button" variant="outline" onClick={clearPendingImage}>
                  {mode === "edit" && product?.image_url
                    ? "Descartar e manter imagem atual"
                    : "Limpar seleção"}
                </Button>
              </div>
            )}
            {displayImageSrc && (
              <div className="mt-4 flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                {/* eslint-disable-next-line @next/next/no-img-element -- backend URL is dynamic */}
                <img src={displayImageSrc} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-white/[0.05]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white/90">Variações</h3>
            <Button size="sm" type="button" variant="outline" onClick={addVariation}>
              Adicionar variação
            </Button>
          </div>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Cada linha precisa de tamanho ou cor (ou ambos). Linhas vazias são ignoradas.
          </p>
          <div className="space-y-4">
            {variationRows.map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-1 gap-3 rounded-lg border border-gray-100 p-4 dark:border-white/[0.06] sm:grid-cols-12 sm:items-end"
              >
                <div className="sm:col-span-3">
                  <Label>Tamanho</Label>
                  <Input
                    value={row.size}
                    onChange={(e) => updateVariation(row.key, { size: e.target.value })}
                    placeholder="ex.: M"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label>Cor</Label>
                  <Input
                    value={row.color}
                    onChange={(e) => updateVariation(row.key, { color: e.target.value })}
                    placeholder="ex.: Preto"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="0"
                    value={String(row.quantity)}
                    onChange={(e) =>
                      updateVariation(row.key, { quantity: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex sm:col-span-3 sm:justify-end">
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => removeVariation(row.key)}
                    disabled={variationRows.length <= 1}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6 dark:border-white/[0.05]">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
          >
            Cancelar
          </Link>
          <Button size="sm" type="submit" disabled={pending || !categoryList.length}>
            {pending ? "Salvando…" : mode === "create" ? "Criar produto" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </form>

    <Modal
      isOpen={isCategoryModalOpen}
      onClose={() => {
        if (!creatingCategory) {
          closeCategoryModal();
        }
      }}
      className="max-w-[560px] m-4"
    >
      <div className={categoryModalInner}>
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            Nova categoria
          </h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
            Ela será selecionada para este produto assim que for criada. Opcionalmente, defina uma categoria
            pai para montar hierarquias (ex.: Vestuário › Camisetas).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 px-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="new-category-name">Nome da categoria</Label>
            <Input
              id="new-category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex.: Camisetas, Calçados…"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="new-category-parent">Categoria pai (opcional)</Label>
            <select
              id="new-category-parent"
              className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              value={newCategoryParentId === "" ? "" : String(newCategoryParentId)}
              onChange={(e) => {
                const v = e.target.value;
                setNewCategoryParentId(v === "" ? "" : Number(v));
              }}
              disabled={creatingCategory}
            >
              <option value="">Nenhuma — categoria raiz</option>
              {categoryList.map((c) => (
                <option key={c.id} value={c.id}>
                  {categoryOptionLabel(categoryList, c.id)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {categoryCreateError && (
          <p className="mx-2 mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {categoryCreateError}
          </p>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 px-2 lg:mt-10">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={creatingCategory}
            onClick={closeCategoryModal}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            type="button"
            disabled={creatingCategory}
            onClick={() => void handleCreateCategory()}
          >
            {creatingCategory ? "Criando…" : "Criar e selecionar"}
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
