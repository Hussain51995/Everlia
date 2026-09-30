import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "CRM Dashboard - Everlia",
  description:
    "Manage your client retention, automated direct mail campaigns & ROI metrics.",
};

export default function DashboardPage() {
  return <DashboardHome />;
}
