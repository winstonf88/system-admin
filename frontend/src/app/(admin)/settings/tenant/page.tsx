import type { Metadata } from "next";
import TenantSettingsPageClient from "@/app/(admin)/settings/tenant/TenantSettingsPageClient";

export const metadata: Metadata = {
  title: "Configurações | System Admin",
  description: "Nome da organização",
};

export default function TenantSettingsPage() {
  return <TenantSettingsPageClient />;
}
