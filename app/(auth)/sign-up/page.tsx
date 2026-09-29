import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account - HomeLink CRM",
  description: "Start automating your client retention with HomeLink direct mail & CRM.",
};

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Select your industry and organization, then create your HomeLink login."
    >
      <SignUpForm />
    </AuthLayout>
  );
}
