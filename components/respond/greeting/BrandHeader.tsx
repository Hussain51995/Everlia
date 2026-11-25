"use client";

import { Logo } from "@/components/ui/Logo";

export function BrandHeader() {
  return (
    <header className="flex flex-col items-center pb-3 pt-1 text-center min-[360px]:pb-3.5 sm:pb-5 sm:pt-2">
      <Logo href="/" height={80} />
    </header>
  );
}
