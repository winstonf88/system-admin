"use client";

import { useEffect, useState } from "react";

import UsersManagement from "@/components/users/UsersManagement";
import type { UserRow } from "@/components/users/user-types";
import { getAuthSession } from "@/lib/api-client/auth";
import { getUsers } from "@/lib/api-client/users";

export default function UsersPageClient() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setUsers(null);
    setCurrentUserId(null);
    setStatus(null);
    void (async () => {
      const [usersResult, sessionResult] = await Promise.all([
        getUsers(),
        getAuthSession(),
      ]);
      if (!active) {
        return;
      }
      if (!usersResult.ok) {
        setStatus(usersResult.status);
        return;
      }
      setUsers(usersResult.data);
      if (sessionResult.ok) {
        setCurrentUserId(sessionResult.data.id);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (users === null && status === null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <p className="text-gray-700 dark:text-gray-300">Carregando usuários...</p>
      </div>
    );
  }

  if (status === 401) {
    return (
      <>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Usuários
          </h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <p className="text-gray-700 dark:text-gray-300">
            Sua sessão não inclui credenciais de API. Saia e entre novamente para
            ver o diretório de usuários.
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
            Usuários
          </h2>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-red-800 dark:text-red-200">
            Não foi possível carregar os usuários (HTTP {status}).
          </p>
        </div>
      </>
    );
  }

  return <UsersManagement users={users ?? []} currentUserId={currentUserId} />;
}
