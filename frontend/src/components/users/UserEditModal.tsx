"use client";

import { updateUserAction } from "@/app/actions/users";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/form/switch/Switch";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import type { UserRow } from "@/components/users/user-types";
import React, { useEffect, useState } from "react";

const modalInner =
  "no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11";

type Props = {
  user: UserRow | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful save (e.g. `router.refresh()` or refetch session). */
  onSaved?: () => void | Promise<void>;
  title?: string;
  description?: string;
};

export default function UserEditModal({
  user,
  isOpen,
  onClose,
  onSaved,
  title = "Editar usuário",
  description = "Atualize os dados do usuário. Deixe a senha em branco para manter a senha atual.",
}: Props) {
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setEditError(null);
      setEditPassword("");
      setEditEmail(user.email);
      setEditFirst(user.first_name ?? "");
      setEditLast(user.last_name ?? "");
      setEditActive(user.is_active);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      return;
    }
    setEditError(null);
    setPending(true);
    try {
      const r = await updateUserAction(user.id, {
        email: editEmail,
        password: editPassword,
        first_name: editFirst,
        last_name: editLast,
        is_active: editActive,
      });
      if (r.ok) {
        await onSaved?.();
        onClose();
      } else {
        setEditError(r.error);
      }
    } finally {
      setPending(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[700px] m-4">
      <div className={modalInner}>
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">{title}</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">{description}</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col">
          {editError && (
            <p className="mb-4 px-2 text-sm text-red-600 dark:text-red-400">{editError}</p>
          )}
          <div className="custom-scrollbar max-h-[450px] overflow-y-auto px-2 pb-3">
            <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
              Informações pessoais
            </h5>
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
              <div className="col-span-2 lg:col-span-1">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  minLength={8}
                  placeholder="Deixe em branco para manter a atual"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <Label>Nome</Label>
                <Input type="text" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} />
              </div>
              <div className="col-span-2 lg:col-span-1">
                <Label>Sobrenome</Label>
                <Input type="text" value={editLast} onChange={(e) => setEditLast(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Switch label="Ativo" checked={editActive} onChange={setEditActive} />
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Fechar
            </Button>
            <Button size="sm" type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
