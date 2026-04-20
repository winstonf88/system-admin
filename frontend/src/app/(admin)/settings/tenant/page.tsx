import type { Metadata } from "next";
import TenantSettingsForm from "@/components/tenant/TenantSettingsForm";
import { fetchBackendAuthenticated } from "@/lib/backend-server-fetch";

export const metadata: Metadata = {
  title: "Configurações | System Admin",
  description: "Nome da organização",
};

export const dynamic = "force-dynamic";

type TenantApi = {
  name: string;
};

export default async function TenantSettingsPage() {
  const res = await fetchBackendAuthenticated("/api/tenant/");

  if (res === null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente para editar a organização.
          </p>
        </div>
      </>
    );
  }

  if (!res.ok) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações</h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar a organização (HTTP {res.status}).
          </p>
        </div>
      </>
    );
  }

  const tenant = (await res.json()) as TenantApi;

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Configurações</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nome da sua organização no painel.
        </p>
      </div>
      <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TenantSettingsForm initial={{ name: tenant.name }} />
      </div>
    </>
  );
}
