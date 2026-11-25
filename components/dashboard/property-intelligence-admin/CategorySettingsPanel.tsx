"use client";

import { useEffect, useMemo, useState } from "react";
import {
  usePropertyIntelligenceSettings,
  useUpdatePropertyIntelligenceSettings,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { AlertCircleIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import {
  CATEGORY_LABELS,
  categorySupportsListingLimit,
  categorySupportsRadius,
  formatSeconds,
} from "./labels";

type Draft = {
  enabled: boolean;
  providerId: string;
  browserTtlSeconds: number;
  databaseTtlSeconds: number;
  searchRadiusMiles: number | null;
  listingLimit: number | null;
};

export function CategorySettingsPanel() {
  const { showToast } = useToast();
  const settingsQuery = usePropertyIntelligenceSettings();
  const updateSettings = useUpdatePropertyIntelligenceSettings();
  const [activeCategory, setActiveCategory] =
    useState<PropertyDataCategory>("property_details");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const providers = settingsQuery.data?.providers ?? [];
  const category = settingsQuery.data?.settings.categories[activeCategory];

  useEffect(() => {
    if (!category) return;
    setDraft({
      enabled: category.enabled,
      providerId: String(category.providerId || "rentcast"),
      browserTtlSeconds: category.browserTtlSeconds,
      databaseTtlSeconds: category.databaseTtlSeconds,
      searchRadiusMiles: category.searchRadiusMiles,
      listingLimit: category.listingLimit,
    });
    setFormError(null);
  }, [category, activeCategory]);

  const selectableProviders = useMemo(
    () =>
      providers.filter(
        (p) =>
          p.selectable && p.supportedCategories.includes(activeCategory)
      ),
    [providers, activeCategory]
  );

  const retentionNote = useMemo(() => {
    const provider = providers.find((p) => p.id === draft?.providerId);
    const cap = provider?.capabilities.find(
      (c) => c.category === activeCategory
    );
    return cap?.retentionNotes ?? null;
  }, [providers, draft?.providerId, activeCategory]);

  const maxDbTtl = useMemo(() => {
    const provider = providers.find((p) => p.id === draft?.providerId);
    const cap = provider?.capabilities.find(
      (c) => c.category === activeCategory
    );
    return cap?.maxDatabaseTtlSeconds ?? null;
  }, [providers, draft?.providerId, activeCategory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setFormError(null);

    if (draft.browserTtlSeconds > draft.databaseTtlSeconds) {
      setFormError("Browser TTL must not exceed database TTL");
      return;
    }
    if (maxDbTtl != null && draft.databaseTtlSeconds > maxDbTtl) {
      setFormError(
        `Database TTL exceeds provider retention limit (${formatSeconds(maxDbTtl)})`
      );
      return;
    }
    if (
      !selectableProviders.some((p) => p.id === draft.providerId)
    ) {
      setFormError("Selected provider does not support this category");
      return;
    }

    updateSettings.mutate(
      {
        category: {
          category: activeCategory,
          enabled: draft.enabled,
          providerId: draft.providerId,
          browserTtlSeconds: Math.floor(draft.browserTtlSeconds),
          databaseTtlSeconds: Math.floor(draft.databaseTtlSeconds),
          searchRadiusMiles: categorySupportsRadius(activeCategory)
            ? draft.searchRadiusMiles
            : null,
          listingLimit: categorySupportsListingLimit(activeCategory)
            ? draft.listingLimit
            : null,
        },
      },
      {
        onSuccess: (data) => {
          const next =
            data.settings.categories[activeCategory]?.configVersion;
          showToast({
            tone: "success",
            title: "Category updated",
            description: `Config version is now ${next}. Cache validity will reconcile on next read.`,
          });
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to update category"
          );
        },
      }
    );
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <ThemeLoader label="Loading category settings…" className="py-8" />
      </div>
    );
  }

  if (settingsQuery.isError || !draft) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
        {settingsQuery.error instanceof ApiClientError
          ? settingsQuery.error.message
          : "Failed to load category settings"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PROPERTY_DATA_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition-colors ${
              activeCategory === cat
                ? "bg-[#38B2D1] text-white"
                : "border border-[#C4EBF2] bg-white text-[#557393] hover:text-[#0B1F3D]"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            {CATEGORY_LABELS[activeCategory]}
          </h2>
          <p className="mt-1 text-sm text-[#557393]">
            Config version: {category?.configVersion ?? "—"}. Browser TTL must
            not exceed database TTL.
          </p>
        </div>

        {formError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        {retentionNote ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Retention: {retentionNote}
          </p>
        ) : null}

        <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3">
          <span className="text-sm font-semibold text-[#0B1F3D]">Enabled</span>
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) =>
              setDraft({ ...draft, enabled: e.target.checked })
            }
            className="h-4 w-4 accent-[#38B2D1]"
          />
        </label>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
            Provider
          </label>
          <select
            value={draft.providerId}
            onChange={(e) =>
              setDraft({
                ...draft,
                providerId: e.target.value,
              })
            }
            className="mt-1 w-full max-w-sm rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
          >
            {selectableProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
                {p.isMock ? " (dev/test)" : ""}
                {!p.configured && !p.isMock ? " — not configured" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Browser cache TTL (seconds)
            </label>
            <input
              type="number"
              min={1}
              value={draft.browserTtlSeconds}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  browserTtlSeconds: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
            <p className="mt-1 text-xs text-[#557393]">
              ≈ {formatSeconds(draft.browserTtlSeconds)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Database cache TTL (seconds)
            </label>
            <input
              type="number"
              min={1}
              value={draft.databaseTtlSeconds}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  databaseTtlSeconds: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
            <p className="mt-1 text-xs text-[#557393]">
              ≈ {formatSeconds(draft.databaseTtlSeconds)}
              {maxDbTtl != null
                ? ` · provider max ${formatSeconds(maxDbTtl)}`
                : ""}
            </p>
          </div>
        </div>

        {categorySupportsRadius(activeCategory) ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Search radius (miles)
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              max={100}
              value={draft.searchRadiusMiles ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  searchRadiusMiles: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="mt-1 w-full max-w-xs rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
          </div>
        ) : null}

        {categorySupportsListingLimit(activeCategory) ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Listing limit
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={draft.listingLimit ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  listingLimit: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="mt-1 w-full max-w-xs rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
        >
          {updateSettings.isPending ? "Saving…" : "Save category"}
        </button>
      </form>
    </div>
  );
}
