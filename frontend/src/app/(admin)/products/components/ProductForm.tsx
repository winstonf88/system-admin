"use client";

import { createCategoryAction } from "@/app/actions/categories";
import {
  createProductAction,
  deleteProductImageAction,
  updateProductAction,
} from "@/app/actions/products";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import type { CategoryOption, ProductRow } from "@/app/(admin)/products/components/product-types";
import {
  categoryOptionLabel,
  sortedCategorySelectOptions,
} from "@/app/(admin)/products/components/category-labels";
import { CloseLineIcon, PlusIcon } from "@/icons";
import { backendPublicUrl } from "@/lib/api-public";
import { uploadProductImageWithProgress } from "@/lib/upload-product-image";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

/** Product image upload limit (must stay at or below Next.js body limits). */
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
/** Max files per drop selection (UI batch). */
const MAX_IMAGE_FILES = 5;
/** Total images per product (aligned with backend). */
const MAX_PRODUCT_IMAGES = 10;

function formatMaxImageLabel(): string {
  return `${Math.round(MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024))} MB`;
}

type PendingFileItem = { id: string; file: File };
type UploadProgressItem = {
  id: string;
  fileName: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
    if (product?.category_ids?.length) {
      return [...product.category_ids];
    }
    const first = categories[0]?.id;
    return first != null ? [first] : [];
  });
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[] | null>(null);
  const [submitPhase, setSubmitPhase] = useState<"idle" | "saving" | "uploading">("idle");

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
  /** Shown inside the image dropzone (not the form-wide alert). */
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const openImageLightbox = (e: React.MouseEvent, src: string, alt: string) => {
    e.preventDefault();
    e.stopPropagation();
    setImageLightbox({ src, alt });
  };

  const closeCategoryModal = () => {
    setCategoryCreateError(null);
    setNewCategoryName("");
    setNewCategoryParentId("");
    closeCategoryModalBase();
  };

  const pendingObjectUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pendingFiles) {
      map.set(p.id, URL.createObjectURL(p.file));
    }
    return map;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      for (const url of pendingObjectUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pendingObjectUrls]);

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
      setSelectedCategoryIds((prev) => [...new Set([...prev, r.category.id])]);
      setError(null);
      setImageUploadError(null);
      closeCategoryModal();
      router.refresh();
    } finally {
      setCreatingCategory(false);
    }
  };
  const savedImages = product?.images ?? [];
  const savedImageUrls = useMemo(() => {
    const out: { id: number; src: string }[] = [];
    for (const img of savedImages) {
      const src = backendPublicUrl(img.url);
      if (src) {
        out.push({ id: img.id, src });
      }
    }
    return out;
  }, [savedImages]);

  const busy = submitPhase !== "idle";
  const imageSlotsLeft = Math.max(
    0,
    MAX_PRODUCT_IMAGES - savedImageUrls.length - pendingFiles.length,
  );

  const onImageDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      return;
    }
    setImageUploadError(null);
    setUploadProgress(null);
    setPendingFiles((prev) => {
      const next = [...prev];
      let addedThisBatch = 0;
      for (const file of acceptedFiles) {
        const slotsLeft = MAX_PRODUCT_IMAGES - savedImageUrls.length - next.length;
        if (slotsLeft <= 0) {
          setImageUploadError(
            `Este produto já tem ${MAX_PRODUCT_IMAGES} imagens ou você atingiu o limite ao adicionar novas.`,
          );
          break;
        }
        if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
          setImageUploadError(`Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`);
          continue;
        }
        if (addedThisBatch >= MAX_IMAGE_FILES) {
          setImageUploadError(`No máximo ${MAX_IMAGE_FILES} arquivos por vez.`);
          break;
        }
        next.push({ id: crypto.randomUUID(), file });
        addedThisBatch += 1;
      }
      return next;
    });
  }, [savedImageUrls.length]);

  const onImageDropRejected = useCallback((rejections: FileRejection[]) => {
    const first = rejections[0];
    if (!first) {
      return;
    }
    const codes = new Set(first.errors.map((e) => e.code));
    if (codes.has("file-too-large")) {
      setImageUploadError(`Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`);
      return;
    }
    if (codes.has("file-invalid-type")) {
      setImageUploadError("Envie apenas arquivos de imagem (por exemplo PNG ou JPG).");
      return;
    }
    if (codes.has("too-many-files")) {
      setImageUploadError(`No máximo ${MAX_IMAGE_FILES} arquivos por vez.`);
      return;
    }
    setImageUploadError("Não foi possível usar este arquivo.");
  }, []);

  const dropMaxFiles = Math.min(MAX_IMAGE_FILES, Math.max(imageSlotsLeft, 0));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onImageDrop,
    onDropRejected: onImageDropRejected,
    accept: { "image/*": [] },
    maxSize: MAX_PRODUCT_IMAGE_BYTES,
    maxFiles: dropMaxFiles > 0 ? dropMaxFiles : MAX_IMAGE_FILES,
    multiple: true,
    disabled: busy || imageSlotsLeft === 0,
  });

  const removeSavedImage = async (imageId: number) => {
    if (!product || busy) {
      return;
    }
    setImageUploadError(null);
    setDeletingImageId(imageId);
    try {
      const r = await deleteProductImageAction(product.id, imageId);
      if (!r.ok) {
        setImageUploadError(r.error);
        return;
      }
      router.refresh();
    } finally {
      setDeletingImageId(null);
    }
  };

  const removePendingFile = (id: string) => {
    setImageUploadError(null);
    setUploadProgress(null);
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const clearPendingImages = () => {
    setImageUploadError(null);
    setUploadProgress(null);
    setPendingFiles([]);
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

  const runImageUploads = async (
    productId: number,
    files: PendingFileItem[],
  ): Promise<boolean> => {
    setUploadProgress(
      files.map((p) => ({
        id: p.id,
        fileName: p.file.name,
        status: "queued",
        progress: 0,
      })),
    );
    setSubmitPhase("uploading");

    for (const pf of files) {
      setUploadProgress((prev) =>
        prev?.map((r) => (r.id === pf.id ? { ...r, status: "uploading", progress: 0 } : r)) ?? null,
      );
      const result = await uploadProductImageWithProgress(productId, pf.file, (pct) => {
        setUploadProgress((prev) =>
          prev?.map((r) => (r.id === pf.id ? { ...r, progress: pct } : r)) ?? null,
        );
      });
      if (!result.ok) {
        setUploadProgress((prev) =>
          prev?.map((r) =>
            r.id === pf.id ? { ...r, status: "error", error: result.error, progress: 0 } : r,
          ) ?? null,
        );
        setImageUploadError(result.error);
        return false;
      }
      setUploadProgress((prev) =>
        prev?.map((r) => (r.id === pf.id ? { ...r, status: "done", progress: 100 } : r)) ?? null,
      );
    }
    setUploadProgress(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setImageUploadError(null);
    setUploadProgress(null);

    if (!categoryList.length) {
      setError('É necessário ter pelo menos uma categoria. Clique em “Nova categoria”.');
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setError("Selecione pelo menos uma categoria.");
      return;
    }

    const vars = buildVariations(variationRows);
    for (const v of vars) {
      if (!v.size && !v.color) {
        setError("Cada variação precisa de tamanho ou cor (ou ambos).");
        return;
      }
    }

    for (const pf of pendingFiles) {
      if (pf.file.size > MAX_PRODUCT_IMAGE_BYTES) {
        setImageUploadError(`Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`);
        return;
      }
    }

    const savedCount = mode === "edit" ? savedImageUrls.length : 0;
    if (savedCount + pendingFiles.length > MAX_PRODUCT_IMAGES) {
      setImageUploadError(`No máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`);
      return;
    }

    const filesSnapshot = [...pendingFiles];
    setSubmitPhase("saving");

    try {
      if (mode === "create") {
        const r = await createProductAction({
          name,
          description: description.trim() || null,
          category_ids: selectedCategoryIds,
          variations: vars,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        if (filesSnapshot.length > 0) {
          const ok = await runImageUploads(r.id, filesSnapshot);
          if (!ok) {
            router.replace(`/products/${r.id}/edit`);
            router.refresh();
            return;
          }
          setPendingFiles([]);
        }
        router.push("/products");
        router.refresh();
        return;
      }

      if (product) {
        const r = await updateProductAction(product.id, {
          name,
          description: description.trim() || null,
          category_ids: selectedCategoryIds,
          variations: vars,
        });
        if (!r.ok) {
          setError(r.error);
          return;
        }
        if (filesSnapshot.length > 0) {
          const ok = await runImageUploads(product.id, filesSnapshot);
          if (!ok) {
            return;
          }
          setPendingFiles([]);
        }
        router.push("/products");
        router.refresh();
      }
    } finally {
      setSubmitPhase("idle");
    }
  };

  const pageTitle = mode === "create" ? "Novo produto" : "Editar produto";

  const submitLabel =
    submitPhase === "saving"
      ? "Salvando…"
      : submitPhase === "uploading"
        ? "Enviando imagens…"
        : mode === "create"
          ? "Criar produto"
          : "Salvar alterações";

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
            Abra <strong className="font-semibold">Nova categoria</strong> para cadastrar; ela será
            adicionada à seleção deste produto automaticamente.
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
              <Label htmlFor="product-categories" className="mb-0">
                Categorias
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
            <div
              id="product-categories"
              role="group"
              aria-label="Categorias do produto"
              className="mt-1.5 max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              {categoryList.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Crie uma categoria (botão acima)…</p>
              ) : (
                categoryOptions.map((o) => {
                  const checked = selectedCategoryIds.includes(o.id);
                  const onlyOne = selectedCategoryIds.length === 1 && checked;
                  return (
                    <label
                      key={o.id}
                      className="flex cursor-pointer items-start gap-2.5 rounded-md py-0.5 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900"
                        checked={checked}
                        disabled={onlyOne}
                        onChange={() => {
                          setSelectedCategoryIds((prev) => {
                            if (prev.includes(o.id)) {
                              if (prev.length <= 1) {
                                return prev;
                              }
                              return prev.filter((id) => id !== o.id);
                            }
                            return [...prev, o.id].sort((a, b) => a - b);
                          });
                        }}
                      />
                      <span className="leading-snug">{o.label}</span>
                    </label>
                  );
                })
              )}
            </div>
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
            <Label>Imagens</Label>
            <div
              {...getRootProps({
                className: `rounded-xl border border-dashed border-gray-300 p-7 transition dark:border-gray-700 lg:p-10 ${
                  busy || imageSlotsLeft === 0
                    ? "cursor-not-allowed opacity-70"
                    : "cursor-pointer"
                } ${
                  isDragActive
                    ? "border-brand-500 bg-brand-50 dark:bg-gray-800"
                    : "border-gray-300 bg-gray-50 hover:border-brand-400 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500"
                }`,
              })}
            >
              <input {...getInputProps()} />
              <div className="dz-message m-0 flex w-full flex-col items-center text-center">
                {imageUploadError && (
                  <p
                    className="mb-4 w-full max-w-md text-sm text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    {imageUploadError}
                  </p>
                )}
                {(savedImageUrls.length > 0 || pendingFiles.length > 0) && (
                  <div className="mb-6 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {savedImageUrls.map((img, idx) => (
                      <div
                        key={img.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-800"
                        title={idx === 0 ? "Imagem principal (miniatura)" : "Imagem salva no produto"}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- backend URL is dynamic */}
                        <img
                          src={img.src}
                          alt=""
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute inset-0 z-10 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                          onClick={(e) =>
                            openImageLightbox(
                              e,
                              img.src,
                              idx === 0 ? "Imagem principal do produto" : "Imagem do produto",
                            )
                          }
                          aria-label="Ver imagem em tamanho real"
                        />
                        <span className="pointer-events-none absolute bottom-1.5 left-1.5 z-20 rounded bg-gray-900/75 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                          {idx === 0 ? "Principal" : "Salva"}
                        </span>
                        <button
                          type="button"
                          disabled={busy || deletingImageId === img.id}
                          aria-label="Remover imagem salva"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void removeSavedImage(img.id);
                          }}
                          className="absolute top-1.5 right-1.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-md backdrop-blur-sm transition hover:bg-gray-900/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <CloseLineIcon className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {pendingFiles.map((p) => {
                      const thumbSrc = pendingObjectUrls.get(p.id);
                      return (
                        <div
                          key={p.id}
                          className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-white/[0.08] dark:bg-gray-800"
                        >
                          {thumbSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element -- object URL preview
                            <img
                              src={thumbSrc}
                              alt=""
                              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null}
                          {thumbSrc ? (
                            <button
                              type="button"
                              className="absolute inset-0 z-10 cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                              onClick={(e) => openImageLightbox(e, thumbSrc, p.file.name)}
                              aria-label={`Ver ${p.file.name} em tamanho real`}
                            />
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Remover ${p.file.name}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removePendingFile(p.id);
                            }}
                            className="absolute top-1.5 right-1.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-md backdrop-blur-sm transition hover:bg-gray-900/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50"
                          >
                            <CloseLineIcon className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                          <span className="sr-only">{p.file.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div
                  className={
                    savedImageUrls.length > 0 || pendingFiles.length > 0
                      ? "mb-4 flex justify-center"
                      : "mb-[22px] flex justify-center"
                  }
                >
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
                  {isDragActive ? "Solte as imagens aqui" : "Arraste imagens para cá"}
                </h4>
                <span className="mb-5 block w-full max-w-[360px] text-sm text-gray-700 dark:text-gray-400">
                  Até {MAX_PRODUCT_IMAGES} imagens no produto ({formatMaxImageLabel()} cada; até{" "}
                  {MAX_IMAGE_FILES} por seleção). O envio ocorre após salvar; a primeira imagem é usada como
                  miniatura na lista.
                </span>
                {imageSlotsLeft === 0 && (
                  <p className="mb-3 text-sm text-amber-700 dark:text-amber-400/90" role="status">
                    Limite de {MAX_PRODUCT_IMAGES} imagens atingido. Remova uma imagem para adicionar outras.
                  </p>
                )}
                <span className="text-theme-sm font-medium text-brand-500 underline">
                  Procurar arquivos
                </span>
                {pendingFiles.length > 0 && (
                  <div
                    className="mt-5 w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => clearPendingImages()}
                      disabled={busy}
                      className="w-full sm:w-auto"
                    >
                      {mode === "edit" && savedImageUrls.length > 0
                        ? "Descartar apenas as novas imagens (não salvas)"
                        : "Limpar seleção"}
                    </Button>
                  </div>
                )}
                {uploadProgress && uploadProgress.length > 0 && (
                  <div
                    className="mt-5 w-full max-w-2xl rounded-lg border border-gray-200 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
                    role="status"
                    aria-live="polite"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">
                      Envio de imagens
                    </p>
                    <div className="space-y-3">
                      {uploadProgress.map((row) => (
                        <div key={row.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">
                              {row.fileName}
                            </span>
                            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                              {row.status === "queued" && "Na fila"}
                              {row.status === "uploading" && `${row.progress}%`}
                              {row.status === "done" && "Concluído"}
                              {row.status === "error" && (
                                <span className="text-red-600 dark:text-red-400">
                                  {row.error ?? "Erro"}
                                </span>
                              )}
                            </span>
                          </div>
                          {(row.status === "uploading" || row.status === "done") && (
                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <div
                                className="h-full bg-brand-500 transition-all duration-150"
                                style={{
                                  width: `${row.status === "done" ? 100 : row.progress}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
          <Button
            size="sm"
            type="submit"
            disabled={busy || !categoryList.length || selectedCategoryIds.length === 0}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>

    <Modal
      isOpen={imageLightbox !== null}
      onClose={() => setImageLightbox(null)}
      className="m-4 max-h-[90vh] max-w-[min(96vw,1400px)] border-0 !bg-transparent p-0 shadow-none dark:!bg-transparent"
    >
      {imageLightbox ? (
        <div className="flex max-h-[85vh] items-center justify-center px-2 pb-10 pt-2 sm:px-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL or backend URL */}
          <img
            src={imageLightbox.src}
            alt={imageLightbox.alt}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </Modal>

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
            Ela será adicionada às categorias deste produto assim que for criada. Opcionalmente, defina uma
            categoria pai para montar hierarquias (ex.: Vestuário › Camisetas).
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
