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
  BROWSER_TTL_ALLOWLIST,
  BROWSER_TTL_LABELS,
  REDIS_TTL_ALLOWLIST,
  REDIS_TTL_LABELS,
  coerceBrowserTtlSeconds,
  coerceRedisTtlSeconds,
  formatTtlSeconds,
  getRecommendedTtlDefaults,
  type AllowedBrowserTtlSeconds,
  type AllowedRedisTtlSeconds,
} from "@/lib/property-intelligence/settings/ttl-policy";
import {
  CATEGORY_LABELS,
  categorySupportsListingLimit,
  categorySupportsRadius,
} from "./labels";
import { TtlSelect } from "./TtlSelect";

type Draft = {
  enabled: boolean;
  providerId: string;
  browserTtlSeconds: AllowedBrowserTtlSeconds;
  redisTtlSeconds: AllowedRedisTtlSeconds;
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
  const browserCachingEnabled =
    settingsQuery.data?.settings.global.browserCachingEnabled ?? true;

  useEffect(() => {
    if (!category) return;
    setDraft({
      enabled: category.enabled,
      providerId: String(category.providerId || "rentcast"),
      browserTtlSeconds: coerceBrowserTtlSeconds(category.browserTtlSeconds),
      redisTtlSeconds: coerceRedisTtlSeconds(category.redisTtlSeconds),
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

  const maxRedisTtl = useMemo(() => {
    const provider = providers.find((p) => p.id === draft?.providerId);
    const cap = provider?.capabilities.find(
      (c) => c.category === activeCategory
    );
    return cap?.maxRedisTtlSeconds ?? null;
  }, [providers, draft?.providerId, activeCategory]);

  const allowedRedisOptions = useMemo(() => {
    if (maxRedisTtl == null) return REDIS_TTL_ALLOWLIST;
    return REDIS_TTL_ALLOWLIST.filter((seconds) => seconds <= maxRedisTtl);
  }, [maxRedisTtl]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setFormError(null);

    if (draft.browserTtlSeconds > draft.redisTtlSeconds) {
      setFormError("Browser TTL must not exceed Redis TTL");
      return;
    }
    if (maxRedisTtl != null && draft.redisTtlSeconds > maxRedisTtl) {
      setFormError(
        `Redis TTL exceeds provider retention limit (${formatTtlSeconds(maxRedisTtl)}). Choose a shorter duration.`
      );
      return;
    }
    if (!selectableProviders.some((p) => p.id === draft.providerId)) {
      setFormError("Selected provider does not support this category");
      return;
    }

    updateSettings.mutate(
      {
        category: {
          category: activeCategory,
          enabled: draft.enabled,
          providerId: draft.providerId,
          browserTtlSeconds: draft.browserTtlSeconds,
          redisTtlSeconds: draft.redisTtlSeconds,
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
            description: `Config version is now ${next}. Existing entries keep their original fetch time; shorter TTLs expire earlier on next read. No provider requests were triggered.`,
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

  const handleRestoreDefaults = () => {
    if (
      !window.confirm(
        "Restore recommended browser and Redis TTL defaults for all categories? This updates configuration versions and does not refresh property data from providers."
      )
    ) {
      return;
    }
    setFormError(null);
    updateSettings.mutate(
      { restoreDefaults: true },
      {
        onSuccess: () => {
          showToast({
            tone: "success",
            title: "Defaults restored",
            description:
              "Recommended TTL values applied. No provider requests were triggered.",
          });
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to restore defaults"
          );
        },
      }
    );
  };

  const applyCategoryRecommended = () => {
    if (!draft) return;
    const defaults = getRecommendedTtlDefaults(activeCategory);
    setDraft({
      ...draft,
      browserTtlSeconds: defaults.browserTtlSeconds,
      redisTtlSeconds: defaults.redisTtlSeconds,
    });
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
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <button
          type="button"
          onClick={handleRestoreDefaults}
          disabled={updateSettings.isPending}
          className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-1.5 text-xs font-bold text-[#0B1F3D] disabled:opacity-60"
        >
          Restore recommended defaults
        </button>
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
            not exceed Redis TTL. Changing TTL updates configuration versions
            and reconciles validity from the original fetch timestamp.
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

        {!browserCachingEnabled ? (
          <p className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-2 text-xs font-medium text-[#557393]">
            Browser caching is disabled globally. Browser TTL settings are
            preserved but L1 cache writes are inactive until re-enabled.
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
            Property data provider
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
          <TtlSelect
            id={`browser-ttl-${activeCategory}`}
            label="Browser cache duration"
            value={draft.browserTtlSeconds}
            options={BROWSER_TTL_ALLOWLIST}
            labels={BROWSER_TTL_LABELS}
            disabled={!browserCachingEnabled}
            onChange={(browserTtlSeconds) =>
              setDraft({ ...draft, browserTtlSeconds })
            }
            hint="30 minutes–3 hours"
          />
          <TtlSelect
            id={`redis-ttl-${activeCategory}`}
            label="Redis cache duration"
            value={
              (allowedRedisOptions.includes(draft.redisTtlSeconds)
                ? draft.redisTtlSeconds
                : allowedRedisOptions[allowedRedisOptions.length - 1] ??
                  draft.redisTtlSeconds) as AllowedRedisTtlSeconds
            }
            options={allowedRedisOptions}
            labels={REDIS_TTL_LABELS}
            onChange={(redisTtlSeconds) =>
              setDraft({ ...draft, redisTtlSeconds })
            }
            hint={
              maxRedisTtl != null
                ? `Provider max ${formatTtlSeconds(maxRedisTtl)}`
                : "1–90 days"
            }
          />
        </div>

        {maxRedisTtl != null && allowedRedisOptions.length < REDIS_TTL_ALLOWLIST.length ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Some Redis durations are hidden because the selected provider
            retention limit is {formatTtlSeconds(maxRedisTtl)}.
          </p>
        ) : null}

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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
          >
            {updateSettings.isPending ? "Saving…" : "Save category"}
          </button>
          <button
            type="button"
            onClick={applyCategoryRecommended}
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-[#C4EBF2] bg-white px-4 text-sm font-bold text-[#0B1F3D]"
          >
            Use recommended TTLs
          </button>
        </div>
      </form>
    </div>
  );
}
