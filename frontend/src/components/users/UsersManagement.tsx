"use client";

import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useModal } from "@/hooks/useModal";
import { createUserAction, deleteUserAction } from "@/app/actions/users";
import UserEditModal from "@/components/users/UserEditModal";
import type { UserRow } from "@/components/users/user-types";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";

type Props = {
  users: UserRow[];
  currentUserId: number | null;
};

function displayName(u: UserRow): string {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  if (parts.length === 0) {
    return "—";
  }
  return parts.join(" ");
}

const modalInner =
  "no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

export default function UsersManagement({ users, currentUserId }: Props) {
  const router = useRouter();
  const createModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirst, setCreateFirst] = useState("");
  const [createLast, setCreateLast] = useState("");
  const [createActive, setCreateActive] = useState(true);

  const openCreate = useCallback(() => {
    setCreateError(null);
    setCreateEmail("");
    setCreatePassword("");
    setCreateFirst("");
    setCreateLast("");
    setCreateActive(true);
    createModal.openModal();
  }, [createModal]);

  const openEdit = useCallback(
    (user: UserRow) => {
      setEditing(user);
      editModal.openModal();
    },
    [editModal],
  );

  const openDelete = useCallback(
    (user: UserRow) => {
      setDeleting(user);
      setDeleteError(null);
      deleteModal.openModal();
    },
    [deleteModal],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setPending(true);
    try {
      const r = await createUserAction({
        email: createEmail,
        password: createPassword,
        first_name: createFirst,
        last_name: createLast,
        is_active: createActive,
      });
      if (r.ok) {
        createModal.closeModal();
        router.refresh();
      } else {
        setCreateError(r.error);
      }
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }
    setDeleteError(null);
    setPending(true);
    try {
      const r = await deleteUserAction(deleting.id);
      if (r.ok) {
        deleteModal.closeModal();
        setDeleting(null);
        router.refresh();
      } else {
        setDeleteError(r.error);
      }
    } finally {
      setPending(false);
    }
  };

  const isSelf = (u: UserRow) => currentUserId !== null && u.id === currentUserId;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <PageBreadCrumb pageTitle="Usuários" />
        <Button size="sm" onClick={openCreate}>
          Adicionar usuário
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-500 text-theme-sm dark:text-gray-400">
            Nenhum usuário encontrado para esta organização. Adicione um usuário para começar.
          </p>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[880px]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Nome
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      E-mail
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-start font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Situação
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 text-end font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-800 dark:text-white/90">
                        {displayName(user)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <Badge size="sm" color={user.is_active ? "success" : "error"}>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-end">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={isSelf(user)}
                            title={isSelf(user) ? "Você não pode excluir sua própria conta" : undefined}
                            onClick={() => openDelete(user)}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-theme-xs hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            Excluir
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={createModal.isOpen} onClose={createModal.closeModal} className="max-w-[700px] m-4">
        <div className={modalInner}>
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Adicionar usuário
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Crie um novo usuário para a sua organização. A senha deve ter pelo menos 8 caracteres.
            </p>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col">
            {createError && (
              <p className="mb-4 px-2 text-sm text-red-600 dark:text-red-400">{createError}</p>
            )}
            <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                Conta
              </h5>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                <div className="col-span-2 lg:col-span-1">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <Label>Nome</Label>
                  <Input
                    type="text"
                    value={createFirst}
                    onChange={(e) => setCreateFirst(e.target.value)}
                  />
                </div>
                <div className="col-span-2 lg:col-span-1">
                  <Label>Sobrenome</Label>
                  <Input
                    type="text"
                    value={createLast}
                    onChange={(e) => setCreateLast(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Checkbox
                    label="Ativo"
                    checked={createActive}
                    onChange={setCreateActive}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
              <Button size="sm" variant="outline" type="button" onClick={createModal.closeModal}>
                Fechar
              </Button>
              <Button size="sm" type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Criar usuário"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <UserEditModal
        user={editing}
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.closeModal();
          setEditing(null);
        }}
        onSaved={() => router.refresh()}
      />

      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[520px] m-4">
        <div className={modalInner}>
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Excluir usuário
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              {deleting
                ? `Remover permanentemente ${deleting.email}? Esta ação não pode ser desfeita.`
                : ""}
            </p>
          </div>
          {deleteError && (
            <p className="mb-4 px-2 text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          )}
          <div className="flex items-center gap-3 px-2 lg:justify-end">
            <Button size="sm" variant="outline" type="button" onClick={deleteModal.closeModal}>
              Cancelar
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={handleDelete}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
