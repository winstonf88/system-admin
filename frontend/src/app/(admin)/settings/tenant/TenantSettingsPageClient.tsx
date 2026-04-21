"use client";

import TenantSettingsForm from "@/components/tenant/TenantSettingsForm";
import { getTenant } from "@/lib/api-client/tenant";
import { useEffect, useState } from "react";

type TenantApi = {
  name: string;
};

export default function TenantSettingsPageClient() {
  const [tenant, setTenant] = useState<TenantApi | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setTenant(null);
    setStatus(null);
    void (async () => {
      const result = await getTenant();
      if (!active) {
        return;
      }
      if (result.ok) {
        setTenant(result.data);
      } else {
        setStatus(result.status);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (tenant === null && status === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">
          Carregando configurações...
        </p>
      </div>
    );
  }

  if (status === 401) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Configurações
          </h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente
            para editar a organização.
          </p>
        </div>
      </>
    );
  }

  if (status !== null) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Configurações
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar a organização (HTTP {status}).
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Configurações
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Nome da sua organização no painel.
        </p>
      </div>
      <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <TenantSettingsForm initial={{ name: tenant?.name ?? "" }} />
      </div>
    </>
  );
}
