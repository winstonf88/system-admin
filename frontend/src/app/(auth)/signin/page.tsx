import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar | System Admin",
  description: "Entre na sua conta",
};

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  return <SignInForm redirectTo={from} />;
}
