"use client";

import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import type {
  CategoryOption,
  ProductRow,
} from "@/app/(admin)/products/components/product-types";
import { sortedCategorySelectOptions } from "@/app/(admin)/products/components/category-labels";
import { backendPublicUrl } from "@/lib/api-public";
import { uploadProductImageWithProgress } from "@/lib/upload-product-image";
import {
  deleteProductImage,
  reorderProductImages,
  createProduct,
  updateProduct,
} from "@/lib/api-client/products";
import { createCategory as createCategoryFromApi } from "@/lib/api-client/categories";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

import { CreateCategoryModal } from "./CreateCategoryModal";
import { ImageLightboxModal } from "./ImageLightboxModal";
import { ProductBasicsSection } from "./ProductBasicsSection";
import { ProductImagesSection } from "./ProductImagesSection";
import { ProductVariationsSection } from "./ProductVariationsSection";
import {
  buildVariations,
  formatMaxImageLabel,
  MAX_IMAGE_FILES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_IMAGE_BYTES,
  type PendingFileItem,
  type SavedImageUrl,
  type UploadProgressItem,
  type VariationDraft,
} from "./form-types";

type Props = {
  categories: CategoryOption[];
  mode: "create" | "edit";
  product?: ProductRow;
};

function toSavedImageUrls(product?: ProductRow): SavedImageUrl[] {
  const urls: SavedImageUrl[] = [];
  for (const image of product?.images ?? []) {
    const src = backendPublicUrl(image.url);
    if (src) {
      urls.push({ id: image.id, src });
    }
  }
  return urls;
}

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
    for (const category of categories) {
      byId.set(category.id, category);
    }
    for (const category of localCategories) {
      byId.set(category.id, category);
    }
    return Array.from(byId.values());
  }, [categories, localCategories]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | "">(
    "",
  );
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(
    null,
  );
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    () => {
      if (product?.category_ids?.length) {
        return [...product.category_ids];
      }
      const firstCategoryId = categories[0]?.id;
      return firstCategoryId != null ? [firstCategoryId] : [];
    },
  );
  const [pendingFiles, setPendingFiles] = useState<PendingFileItem[]>([]);
  const [savedImages, setSavedImages] = useState<SavedImageUrl[]>(() =>
    toSavedImageUrls(product),
  );
  const [uploadProgress, setUploadProgress] = useState<
    UploadProgressItem[] | null
  >(null);
  const [submitPhase, setSubmitPhase] = useState<
    "idle" | "saving" | "uploading"
  >("idle");
  const [reorderingSavedImages, setReorderingSavedImages] = useState(false);
  const [variationRows, setVariationRows] = useState<VariationDraft[]>(() => {
    if (product?.variations?.length) {
      return product.variations.map((variation) => ({
        key: `v-${variation.id}`,
        size: variation.size ?? "",
        color: variation.color ?? "",
        quantity: variation.quantity,
      }));
    }
    return [{ key: crypto.randomUUID(), size: "", color: "", quantity: 0 }];
  });

  const [error, setError] = useState<string | null>(null);
  /** Shown inside the image dropzone (not the form-wide alert). */
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  const openImageLightbox = (
    event: React.MouseEvent,
    src: string,
    alt: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setImageLightbox({ src, alt });
  };

  const closeCategoryModal = () => {
    setCategoryCreateError(null);
    setNewCategoryName("");
    setNewCategoryParentId("");
    closeCategoryModalBase();
  };

  const pendingObjectUrls = useMemo(() => {
    const objectUrls = new Map<string, string>();
    for (const pendingFile of pendingFiles) {
      objectUrls.set(pendingFile.id, URL.createObjectURL(pendingFile.file));
    }
    return objectUrls;
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      for (const objectUrl of pendingObjectUrls.values()) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [pendingObjectUrls]);

  useEffect(() => {
    setSavedImages(toSavedImageUrls(product));
  }, [product]);

  const categoryOptions = sortedCategorySelectOptions(categoryList);

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName.length < 1) {
      setCategoryCreateError("Informe o nome da categoria.");
      return;
    }
    setCategoryCreateError(null);
    setCreatingCategory(true);
    try {
      const response = await createCategoryFromApi({
        name: trimmedName,
        parent_id:
          newCategoryParentId === "" ? null : Number(newCategoryParentId),
      });
      if (!response.ok) {
        setCategoryCreateError(response.error);
        return;
      }
      setLocalCategories((prev) => [...prev, response.category]);
      setSelectedCategoryIds((prev) => [
        ...new Set([...prev, response.category.id]),
      ]);
      setError(null);
      setImageUploadError(null);
      closeCategoryModal();
    } finally {
      setCreatingCategory(false);
    }
  };

  const busy = submitPhase !== "idle" || reorderingSavedImages;
  const imageSlotsLeft = Math.max(
    0,
    MAX_PRODUCT_IMAGES - savedImages.length - pendingFiles.length,
  );

  const onImageDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return;
      }
      setImageUploadError(null);
      setUploadProgress(null);
      setPendingFiles((prev) => {
        const next = [...prev];
        let addedThisBatch = 0;
        for (const file of acceptedFiles) {
          const slotsLeft =
            MAX_PRODUCT_IMAGES - savedImages.length - next.length;
          if (slotsLeft <= 0) {
            setImageUploadError(
              `Este produto já tem ${MAX_PRODUCT_IMAGES} imagens ou você atingiu o limite ao adicionar novas.`,
            );
            break;
          }
          if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
            setImageUploadError(
              `Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`,
            );
            continue;
          }
          if (addedThisBatch >= MAX_IMAGE_FILES) {
            setImageUploadError(
              `No máximo ${MAX_IMAGE_FILES} arquivos por vez.`,
            );
            break;
          }
          next.push({ id: crypto.randomUUID(), file });
          addedThisBatch += 1;
        }
        return next;
      });
    },
    [savedImages.length],
  );

  const onImageDropRejected = useCallback((rejections: FileRejection[]) => {
    const firstRejection = rejections[0];
    if (!firstRejection) {
      return;
    }
    const codes = new Set(
      firstRejection.errors.map((errorItem) => errorItem.code),
    );
    if (codes.has("file-too-large")) {
      setImageUploadError(
        `Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`,
      );
      return;
    }
    if (codes.has("file-invalid-type")) {
      setImageUploadError(
        "Envie apenas arquivos de imagem (por exemplo PNG ou JPG).",
      );
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
      const response = await deleteProductImage(product.id, imageId);
      if (!response.ok) {
        setImageUploadError(response.error);
        return;
      }
      setSavedImages((prev) => prev.filter((image) => image.id !== imageId));
    } finally {
      setDeletingImageId(null);
    }
  };

  const removePendingFile = (id: string) => {
    setImageUploadError(null);
    setUploadProgress(null);
    setPendingFiles((prev) =>
      prev.filter((pendingFile) => pendingFile.id !== id),
    );
  };

  const clearPendingImages = () => {
    setImageUploadError(null);
    setUploadProgress(null);
    setPendingFiles([]);
  };

  const reorderSavedImages = useCallback(
    (orderedImageIds: number[]) => {
      if (orderedImageIds.length !== savedImages.length) {
        return;
      }
      const byId = new Map(savedImages.map((image) => [image.id, image]));
      const nextOrder = orderedImageIds
        .map((imageId) => byId.get(imageId))
        .filter((image): image is SavedImageUrl => image !== undefined);
      if (nextOrder.length !== savedImages.length) {
        return;
      }
      const unchanged = nextOrder.every(
        (image, idx) => image.id === savedImages[idx]?.id,
      );
      if (unchanged) {
        return;
      }

      setImageUploadError(null);
      const previousSavedImages = savedImages;
      setSavedImages(nextOrder);

      if (!product || mode !== "edit") {
        return;
      }

      setReorderingSavedImages(true);
      void (async () => {
        try {
          const response = await reorderProductImages(
            product.id,
            orderedImageIds,
          );
          if (!response.ok) {
            setSavedImages(previousSavedImages);
            setImageUploadError(response.error);
            return;
          }
        } finally {
          setReorderingSavedImages(false);
        }
      })();
    },
    [mode, product, savedImages],
  );

  const reorderPendingFiles = useCallback((orderedPendingIds: string[]) => {
    setPendingFiles((prev) => {
      if (orderedPendingIds.length !== prev.length) {
        return prev;
      }
      const byId = new Map(
        prev.map((pendingFile) => [pendingFile.id, pendingFile]),
      );
      const nextOrder = orderedPendingIds
        .map((pendingId) => byId.get(pendingId))
        .filter(
          (pendingFile): pendingFile is PendingFileItem =>
            pendingFile !== undefined,
        );
      if (nextOrder.length !== prev.length) {
        return prev;
      }
      const unchanged = nextOrder.every(
        (pendingFile, idx) => pendingFile.id === prev[idx]?.id,
      );
      return unchanged ? prev : nextOrder;
    });
  }, []);

  const addVariation = () => {
    setVariationRows((rows) => [
      ...rows,
      { key: crypto.randomUUID(), size: "", color: "", quantity: 0 },
    ]);
  };

  const removeVariation = (key: string) => {
    setVariationRows((rows) => rows.filter((row) => row.key !== key));
  };

  const updateVariation = (
    key: string,
    patch: Partial<Omit<VariationDraft, "key">>,
  ) => {
    setVariationRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        if (prev.length <= 1) {
          return prev;
        }
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId].sort((a, b) => a - b);
    });
  };

  const runImageUploads = async (
    productId: number,
    files: PendingFileItem[],
  ): Promise<boolean> => {
    setUploadProgress(
      files.map((pendingFile) => ({
        id: pendingFile.id,
        fileName: pendingFile.file.name,
        status: "queued",
        progress: 0,
      })),
    );
    setSubmitPhase("uploading");

    for (const pendingFile of files) {
      setUploadProgress(
        (prev) =>
          prev?.map((row) =>
            row.id === pendingFile.id
              ? { ...row, status: "uploading", progress: 0 }
              : row,
          ) ?? null,
      );
      const result = await uploadProductImageWithProgress(
        productId,
        pendingFile.file,
        (pct) => {
          setUploadProgress(
            (prev) =>
              prev?.map((row) =>
                row.id === pendingFile.id ? { ...row, progress: pct } : row,
              ) ?? null,
          );
        },
      );
      if (!result.ok) {
        setUploadProgress(
          (prev) =>
            prev?.map((row) =>
              row.id === pendingFile.id
                ? { ...row, status: "error", error: result.error, progress: 0 }
                : row,
            ) ?? null,
        );
        setImageUploadError(result.error);
        return false;
      }
      setUploadProgress(
        (prev) =>
          prev?.map((row) =>
            row.id === pendingFile.id
              ? { ...row, status: "done", progress: 100 }
              : row,
          ) ?? null,
      );
    }
    setUploadProgress(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setImageUploadError(null);
    setUploadProgress(null);

    if (!categoryList.length) {
      setError(
        "É necessário ter pelo menos uma categoria. Clique em “Nova categoria”.",
      );
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setError("Selecione pelo menos uma categoria.");
      return;
    }

    const variations = buildVariations(variationRows);
    for (const variation of variations) {
      if (!variation.size && !variation.color) {
        setError("Cada variação precisa de tamanho ou cor (ou ambos).");
        return;
      }
    }

    for (const pendingFile of pendingFiles) {
      if (pendingFile.file.size > MAX_PRODUCT_IMAGE_BYTES) {
        setImageUploadError(
          `Cada imagem deve ter no máximo ${formatMaxImageLabel()}.`,
        );
        return;
      }
    }

    const savedCount = mode === "edit" ? savedImages.length : 0;
    if (savedCount + pendingFiles.length > MAX_PRODUCT_IMAGES) {
      setImageUploadError(
        `No máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`,
      );
      return;
    }

    const filesSnapshot = [...pendingFiles];
    setSubmitPhase("saving");

    try {
      if (mode === "create") {
        const response = await createProduct({
          name,
          description: description.trim() || null,
          category_ids: selectedCategoryIds,
          variations,
        });
        if (!response.ok) {
          setError(response.error);
          return;
        }
        if (filesSnapshot.length > 0) {
          const uploaded = await runImageUploads(response.id, filesSnapshot);
          if (!uploaded) {
            router.replace(`/products/${response.id}/edit`);
            return;
          }
          setPendingFiles([]);
        }
        router.push("/products");
        return;
      }

      if (product) {
        const response = await updateProduct(product.id, {
          name,
          description: description.trim() || null,
          category_ids: selectedCategoryIds,
          variations,
        });
        if (!response.ok) {
          setError(response.error);
          return;
        }
        if (filesSnapshot.length > 0) {
          const uploaded = await runImageUploads(product.id, filesSnapshot);
          if (!uploaded) {
            return;
          }
          setPendingFiles([]);
        }
        router.push("/products");
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
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="space-y-6"
      >
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
          {error && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {categoryList.length === 0 && (
            <div
              className="mb-6 rounded-2xl border border-dashed border-brand-400/35 bg-linear-to-br from-brand-50/90 to-white px-4 py-3.5 text-sm text-gray-700 shadow-sm dark:border-brand-700/40 dark:from-brand-950/50 dark:to-gray-900/80 dark:text-gray-300"
              role="status"
            >
              <span className="font-semibold text-gray-900 dark:text-white">
                Comece por uma categoria.
              </span>{" "}
              Abra <strong className="font-semibold">Nova categoria</strong>{" "}
              para cadastrar; ela será adicionada à seleção deste produto
              automaticamente.
            </div>
          )}

          <ProductBasicsSection
            categoryList={categoryList}
            categoryOptions={categoryOptions}
            name={name}
            description={description}
            selectedCategoryIds={selectedCategoryIds}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onToggleCategory={toggleCategory}
            onOpenCategoryModal={() => {
              setCategoryCreateError(null);
              openCategoryModal();
            }}
          />

          <ProductImagesSection
            mode={mode}
            busy={busy}
            deletingImageId={deletingImageId}
            imageSlotsLeft={imageSlotsLeft}
            imageUploadError={imageUploadError}
            isDragActive={isDragActive}
            savedImageUrls={savedImages}
            pendingFiles={pendingFiles}
            pendingObjectUrls={pendingObjectUrls}
            uploadProgress={uploadProgress}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            onOpenLightbox={openImageLightbox}
            onReorderSavedImages={reorderSavedImages}
            onReorderPendingFiles={reorderPendingFiles}
            onRemoveSavedImage={(imageId) => {
              void removeSavedImage(imageId);
            }}
            onRemovePendingFile={removePendingFile}
            onClearPendingImages={clearPendingImages}
          />

          <ProductVariationsSection
            variationRows={variationRows}
            onAddVariation={addVariation}
            onRemoveVariation={removeVariation}
            onUpdateVariation={updateVariation}
          />

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
              disabled={
                busy || !categoryList.length || selectedCategoryIds.length === 0
              }
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>

      <ImageLightboxModal
        image={imageLightbox}
        onClose={() => setImageLightbox(null)}
      />

      <CreateCategoryModal
        isOpen={isCategoryModalOpen}
        creatingCategory={creatingCategory}
        categoryList={categoryList}
        newCategoryName={newCategoryName}
        newCategoryParentId={newCategoryParentId}
        categoryCreateError={categoryCreateError}
        onClose={closeCategoryModal}
        onNameChange={setNewCategoryName}
        onParentIdChange={setNewCategoryParentId}
        onSubmit={() => {
          void handleCreateCategory();
        }}
      />
    </>
  );
}
