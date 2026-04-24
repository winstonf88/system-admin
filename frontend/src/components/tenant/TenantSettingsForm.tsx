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
  instagram_account: string;
  whatsapp_number: string;
};

export default function TenantSettingsForm({
  initial,
}: {
  initial: TenantSettings;
}) {
  const [name, setName] = useState(initial.name);
  const [instagramAccount, setInstagramAccount] = useState(
    initial.instagram_account,
  );
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsapp_number);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.dismiss();
    setLoading(true);
    try {
      const result = await updateTenant({
        name,
        config: {
          instagram_account: instagramAccount || null,
          whatsapp_number: whatsappNumber || null,
        },
      });
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

      <div>
        <Label htmlFor="instagram-account">Instagram</Label>
        <Input
          id="instagram-account"
          type="text"
          value={instagramAccount}
          onChange={(e) => setInstagramAccount(e.target.value)}
          placeholder="@usuario"
        />
      </div>

      <div>
        <Label htmlFor="whatsapp-number">WhatsApp</Label>
        <Input
          id="whatsapp-number"
          type="text"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+55 11 99999-9999"
        />
      </div>

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
