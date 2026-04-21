import type { Metadata } from "next";
import UsersPageClient from "@/app/(admin)/users/UsersPageClient";

export const metadata: Metadata = {
  title: "Usuários | System Admin",
  description: "Usuários da sua organização",
};

export default function UsersPage() {
  return <UsersPageClient />;
}
