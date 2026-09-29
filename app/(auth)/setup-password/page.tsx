import { AuthLayout } from "@/components/auth/AuthLayout";
import { SetupPasswordForm } from "@/components/auth/SetupPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Up Password - HomeLink CRM",
  description: "Create a password to finish setting up your HomeLink account.",
};

export default function SetupPasswordPage() {
  return (
    <AuthLayout
      title="Set up your password"
      subtitle="Choose a strong password to finish creating your HomeLink account."
    >
      <SetupPasswordForm />
    </AuthLayout>
  );
}
