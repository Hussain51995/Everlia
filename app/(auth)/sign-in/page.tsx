import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignInForm } from "@/components/auth/SignInForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - HomeLink CRM",
  description: "Access your HomeLink automated direct mail and client retention dashboard.",
};

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your automated direct mail campaigns & client retention."
    >
      <SignInForm />
    </AuthLayout>
  );
}
