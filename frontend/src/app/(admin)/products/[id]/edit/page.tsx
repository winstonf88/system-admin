import type { Metadata } from "next";

import EditProductPageClient from "@/app/(admin)/products/[id]/edit/EditProductPageClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Editar produto #${id} | System Admin`,
  };
}

export default async function EditProductPage({ params }: Props) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id < 1) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">ID de produto inválido.</p>
      </div>
    );
  }
  return <EditProductPageClient productId={id} />;
}
