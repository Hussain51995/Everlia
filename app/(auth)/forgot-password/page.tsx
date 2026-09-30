import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password - Everlia CRM",
  description: "Recover access to your Everlia account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset password"
      subtitle="Enter your account email and we will send instructions to reset your password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
