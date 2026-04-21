import type { Metadata } from "next";

import ProductsPageClient from "@/app/(admin)/products/components/ProductsPageClient";

export const metadata: Metadata = {
  title: "Produtos | System Admin",
  description: "Produtos da sua organização",
};

export default function ProductsPage() {
  return <ProductsPageClient />;
}
