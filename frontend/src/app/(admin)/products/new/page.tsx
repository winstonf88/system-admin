import type { Metadata } from "next";

import NewProductPageClient from "@/app/(admin)/products/new/NewProductPageClient";

export const metadata: Metadata = {
  title: "Novo produto | System Admin",
  description: "Cadastrar um novo produto",
};

export default function NewProductPage() {
  return <NewProductPageClient />;
}
