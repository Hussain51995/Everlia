import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password - HomeLink CRM",
  description: "Choose a new password for your HomeLink account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password to secure your HomeLink account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
