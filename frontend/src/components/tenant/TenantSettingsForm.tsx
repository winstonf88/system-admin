"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { updateTenant } from "@/lib/api-client/tenant";
import { AUTH_SESSION_REFRESH_EVENT } from "@/lib/auth-session";
import React, { useState } from "react";
import { toast } from "sonner";

export type TenantSettings = {
  name: string;
};

export default function TenantSettingsForm({
  initial,
}: {
  initial: TenantSettings;
}) {
  const [name, setName] = useState(initial.name);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.dismiss();
    setLoading(true);
    try {
      const result = await updateTenant({ name });
      if (!result.ok) {
        toast.error(result.error, { duration: 5000 });
        return;
      }
      window.dispatchEvent(new Event(AUTH_SESSION_REFRESH_EVENT));
      toast.success("Configurações salvas com sucesso.", { duration: 3000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div>
        <Label htmlFor="tenant-name">Nome da organização</Label>
        <Input
          id="tenant-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome exibido no painel"
        />
      </div>

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
