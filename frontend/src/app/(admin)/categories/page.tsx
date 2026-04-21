import type { Metadata } from "next";

import CategoriesPageClient from "@/app/(admin)/categories/CategoriesPageClient";

export const metadata: Metadata = {
  title: "Categorias | System Admin",
  description: "Gerencie a árvore de categorias dos produtos",
};

export default function CategoriesPage() {
  return <CategoriesPageClient />;
}
