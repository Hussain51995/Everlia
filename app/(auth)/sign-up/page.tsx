import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpWizard } from "@/components/auth/signup";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account - Everlia CRM",
  description:
    "Join your organization or create a private Everlia workspace with verified domain discovery.",
};

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Select your industry, enter your work email, and we’ll help you find or create the right workspace."
    >
      <SignUpWizard />
    </AuthLayout>
  );
}
