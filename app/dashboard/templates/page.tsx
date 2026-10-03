"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTemplates } from "@/hooks/cards";
import {
  TEMPLATE_CATEGORY_LABELS,
  type CardTemplateCategory,
} from "@/lib/types/cards";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { RefetchButton } from "@/components/ui/RefetchButton";
import { ApiClientError } from "@/lib/api/client";

const CATEGORIES: Array<CardTemplateCategory | "all"> = [
  "all",
  "birthday",
  "thank_you",
  "home_anniversary",
  "holiday",
  "congratulations",
  "welcome_home",
  "anniversary",
  "customer_appreciation",
];

export default function TemplatesPage() {
  const { data: templates, isLoading, error, refetch, isFetching } =
    useTemplates();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("all");

  const filtered = useMemo(() => {
    if (!templates) return [];
    if (category === "all") return templates;
    return templates.filter((t) => t.category === category);
  }, [templates, category]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1F3D]">
            Greeting Card Templates
          </h1>
          <p className="mt-1 text-sm text-[#557393]">
            Choose a professionally designed 4×6 postcard, then personalize approved fields.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefetchButton
            onClick={() => refetch()}
            isRefreshing={isFetching && !isLoading}
          />
          <Link
            href="/dashboard/cards"
            className="text-xs font-bold text-[#38B2D1] hover:underline"
          >
            View my cards →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              category === c
                ? "bg-[#38B2D1] text-white"
                : "bg-white text-[#557393] border border-[#C4EBF2] hover:border-[#38B2D1]"
            }`}
          >
            {c === "all" ? "All" : TEMPLATE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16">
          <ThemeLoader label="Loading templates…" size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error instanceof ApiClientError
            ? error.message
            : "Failed to load templates"}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#C4EBF2] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#0B1F3D]">No templates yet</p>
          <p className="mt-1 text-xs text-[#557393]">
            Run the template seed script after applying migration 004.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Link
              key={template.id}
              href={`/dashboard/cards/new?templateId=${template.id}`}
              className="group overflow-hidden rounded-3xl border border-[#C4EBF2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="aspect-[3/2] overflow-hidden bg-[#F0FAFC]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    template.preview_image_url ||
                    template.front_background_url
                  }
                  alt={template.name}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-1 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#38B2D1]">
                  {TEMPLATE_CATEGORY_LABELS[template.category]}
                </div>
                <h3 className="text-base font-extrabold text-[#0B1F3D]">
                  {template.name}
                </h3>
                <p className="text-xs text-[#557393]">
                  Customize name, message, branding & QR — then send.
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
