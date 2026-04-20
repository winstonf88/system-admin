import type React from "react";
import { useCallback, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import Label from "@/components/form/Label";
import { CloseLineIcon } from "@/icons";
import Button from "@/components/ui/button/Button";

import type { PendingFileItem, SavedImageUrl, UploadProgressItem } from "./form-types";
import { formatMaxImageLabel, MAX_IMAGE_FILES, MAX_PRODUCT_IMAGES } from "./form-types";

type Props = {
  mode: "create" | "edit";
  busy: boolean;
  deletingImageId: number | null;
  imageSlotsLeft: number;
  imageUploadError: string | null;
  isDragActive: boolean;
  savedImageUrls: SavedImageUrl[];
  pendingFiles: PendingFileItem[];
  pendingObjectUrls: Map<string, string>;
  uploadProgress: UploadProgressItem[] | null;
  getRootProps: (props: { className: string }) => React.HTMLAttributes<HTMLDivElement>;
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
  onOpenLightbox: (event: React.MouseEvent, src: string, alt: string) => void;
  onReorderSavedImages: (orderedImageIds: number[]) => void;
  onReorderPendingFiles: (orderedPendingIds: string[]) => void;
  onRemoveSavedImage: (imageId: number) => void;
  onRemovePendingFile: (id: string) => void;
  onClearPendingImages: () => void;
};

function parseSortableId(value: string): { kind: "saved" | "pending"; id: number | string } | null {
  if (value.startsWith("saved-")) {
    const id = Number(value.slice("saved-".length));
    if (!Number.isFinite(id)) {
      return null;
    }
    return { kind: "saved", id };
  }
  if (value.startsWith("pending-")) {
    const id = value.slice("pending-".length);
    if (!id) {
      return null;
    }
    return { kind: "pending", id };
  }
  return null;
}

type SortableThumbProps = {
  sortableId: string;
  busy: boolean;
  title?: string;
  children: React.ReactNode;
};

function SortableThumb({ sortableId, busy, title, children }: SortableThumbProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    disabled: busy,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 touch-none dark:border-white/[0.08] dark:bg-gray-800 ${
        isDragging ? "z-20 cursor-grabbing shadow-lg ring-2 ring-brand-400" : "cursor-grab"
      }`}
      title={title}
      aria-label="Arraste para reordenar"
    >
      {children}
    </div>
  );
}

export function ProductImagesSection({
  mode,
  busy,
  deletingImageId,
  imageSlotsLeft,
  imageUploadError,
  isDragActive,
  savedImageUrls,
  pendingFiles,
  pendingObjectUrls,
  uploadProgress,
  getRootProps,
  getInputProps,
  onOpenLightbox,
  onReorderSavedImages,
  onReorderPendingFiles,
  onRemoveSavedImage,
  onRemovePendingFile,
  onClearPendingImages,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const savedSortableIds = useMemo(
    () => savedImageUrls.map((img) => `saved-${img.id}`),
    [savedImageUrls],
  );
  const pendingSortableIds = useMemo(
    () => pendingFiles.map((pendingFile) => `pending-${pendingFile.id}`),
    [pendingFiles],
  );
  const sortableIds = useMemo(() => [...savedSortableIds, ...pendingSortableIds], [savedSortableIds, pendingSortableIds]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      const activeMeta = parseSortableId(String(active.id));
      const overMeta = parseSortableId(String(over.id));
      if (!activeMeta || !overMeta || activeMeta.kind !== overMeta.kind) {
        return;
      }

      if (activeMeta.kind === "saved") {
        const oldIndex = savedImageUrls.findIndex((image) => image.id === activeMeta.id);
        const newIndex = savedImageUrls.findIndex((image) => image.id === overMeta.id);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
          return;
        }
        onReorderSavedImages(arrayMove(savedImageUrls, oldIndex, newIndex).map((image) => image.id));
        return;
      }

      const oldIndex = pendingFiles.findIndex((pendingFile) => pendingFile.id === activeMeta.id);
      const newIndex = pendingFiles.findIndex((pendingFile) => pendingFile.id === overMeta.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return;
      }
      onReorderPendingFiles(arrayMove(pendingFiles, oldIndex, newIndex).map((pendingFile) => pendingFile.id));
    },
    [onReorderPendingFiles, onReorderSavedImages, pendingFiles, savedImageUrls],
  );

  return (
    <div className="col-span-2">
      <Label>Imagens</Label>
      <div
        {...getRootProps({
          className: `rounded-xl border border-dashed border-gray-300 p-7 transition dark:border-gray-700 lg:p-10 ${
            busy || imageSlotsLeft === 0 ? "cursor-not-allowed opacity-70" : "cursor-pointer"
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
            <p className="mb-4 w-full max-w-md text-sm text-red-600 dark:text-red-400" role="alert">
              {imageUploadError}
            </p>
          )}
          {(savedImageUrls.length > 0 || pendingFiles.length > 0) && (
            <DndContext
              id="product-images-dnd-context"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                <div className="mb-6 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {savedImageUrls.map((img, idx) => (
                    <SortableThumb
                      key={img.id}
                      sortableId={`saved-${img.id}`}
                      busy={busy || deletingImageId === img.id}
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
                        onClick={(event) =>
                          onOpenLightbox(
                            event,
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
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onRemoveSavedImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-md backdrop-blur-sm transition hover:bg-gray-900/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <CloseLineIcon className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </SortableThumb>
                  ))}
                  {pendingFiles.map((pendingFile) => {
                    const thumbSrc = pendingObjectUrls.get(pendingFile.id);
                    return (
                      <SortableThumb
                        key={pendingFile.id}
                        sortableId={`pending-${pendingFile.id}`}
                        busy={busy}
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
                            onClick={(event) => onOpenLightbox(event, thumbSrc, pendingFile.file.name)}
                            aria-label={`Ver ${pendingFile.file.name} em tamanho real`}
                          />
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={`Remover ${pendingFile.file.name}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onRemovePendingFile(pendingFile.id);
                          }}
                          className="absolute top-1.5 right-1.5 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900/70 text-white shadow-md backdrop-blur-sm transition hover:bg-gray-900/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <CloseLineIcon className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <span className="sr-only">{pendingFile.file.name}</span>
                      </SortableThumb>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
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
            miniatura na lista. Você também pode arrastar as miniaturas para reordenar.
          </span>
          {imageSlotsLeft === 0 && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-400/90" role="status">
              Limite de {MAX_PRODUCT_IMAGES} imagens atingido. Remova uma imagem para adicionar outras.
            </p>
          )}
          {pendingFiles.length > 0 && (
            <div
              className="mt-5 w-full max-w-md"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              role="presentation"
            >
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={onClearPendingImages}
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
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">Envio de imagens</p>
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
                          <span className="text-red-600 dark:text-red-400">{row.error ?? "Erro"}</span>
                        )}
                      </span>
                    </div>
                    {(row.status === "uploading" || row.status === "done") && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-full bg-brand-500 transition-all duration-150"
                          style={{ width: `${row.status === "done" ? 100 : row.progress}%` }}
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
  );
}
