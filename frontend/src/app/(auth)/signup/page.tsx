import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastrar-se | System Admin",
  description: "Crie a sua conta",
};

export default function SignUp() {
  return <SignUpForm />;
}
