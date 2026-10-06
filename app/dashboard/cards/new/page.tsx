"use client";

import { Suspense } from "react";
import { NewCardForm } from "@/components/dashboard/cards/new";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

export default function NewCardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16">
          <ThemeLoader label="Loading…" size="lg" />
        </div>
      }
    >
      <NewCardForm />
    </Suspense>
  );
}
