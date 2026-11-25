"use client";

import { useState } from "react";
import {
  useInvalidatePropertyIntelligenceCache,
  usePropertyIntelligenceCache,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { AlertCircleIcon, SearchIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";
import { PROPERTY_DATA_CATEGORIES } from "@/lib/types/property-intelligence";
import type { PropertyDataCategory } from "@/lib/types/property-intelligence";
import { CATEGORY_LABELS } from "./labels";

export function CacheManagementPanel() {
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const cacheQuery = usePropertyIntelligenceCache(activeQuery);
  const invalidate = useInvalidatePropertyIntelligenceCache();

  const [identityKey, setIdentityKey] = useState("");
  const [category, setCategory] =
    useState<PropertyDataCategory>("property_details");
  const [zipCountry, setZipCountry] = useState("US");
  const [zipCode, setZipCode] = useState("");
  const [providerId, setProviderId] = useState("rentcast");
  const [actionError, setActionError] = useState<string | null>(null);

  const runInvalidate = (
    confirmMessage: string | null,
    body: Parameters<typeof invalidate.mutate>[0]
  ) => {
    setActionError(null);
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    invalidate.mutate(body, {
      onSuccess: (data) => {
        showToast({
          tone: "success",
          title: "Cache invalidated",
          description: `${data.invalidation.invalidatedCount} entr${
            data.invalidation.invalidatedCount === 1 ? "y" : "ies"
          } soft-invalidated. No provider requests were triggered.`,
        });
      },
      onError: (error) => {
        setActionError(
          error instanceof ApiClientError
            ? error.message
            : "Invalidation failed"
        );
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            Cache Management
          </h2>
          <p className="mt-1 text-sm text-[#557393]">
            Inspect L2 metadata and soft-invalidate entries. Invalidation never
            triggers paid API requests. Raw provider payloads are not shown.
          </p>
        </div>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveQuery(searchInput.trim());
          }}
        >
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9BB3C9]" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search identity key prefix…"
              className="w-full rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] py-3 pl-10 pr-4 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#0B1F3D] px-5 text-sm font-bold text-white"
          >
            Search
          </button>
        </form>

        {cacheQuery.isLoading ? (
          <ThemeLoader label="Loading cache entries…" className="py-6" />
        ) : cacheQuery.isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            {cacheQuery.error instanceof ApiClientError
              ? cacheQuery.error.message
              : "Failed to load cache"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#C4EBF2] text-xs uppercase tracking-wider text-[#557393]">
                  <th className="py-2 pr-3 font-bold">Identity</th>
                  <th className="py-2 pr-3 font-bold">Category</th>
                  <th className="py-2 pr-3 font-bold">Provider</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 pr-3 font-bold">Fetched</th>
                  <th className="py-2 font-bold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {(cacheQuery.data?.entries ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center text-sm text-[#557393]"
                    >
                      No cache entries found.
                    </td>
                  </tr>
                ) : (
                  cacheQuery.data!.entries.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[#E8F7FB] last:border-0"
                    >
                      <td className="max-w-[220px] truncate py-2.5 pr-3 font-mono text-xs text-[#0B1F3D]">
                        {row.normalizedIdentityKey}
                      </td>
                      <td className="py-2.5 pr-3 text-[#0B1F3D]">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </td>
                      <td className="py-2.5 pr-3 text-[#557393]">
                        {row.providerId}
                        {row.isNegative ? " · negative" : ""}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            row.isFresh
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-[#F0FAFC] text-[#557393]"
                          }`}
                        >
                          {row.status}
                          {row.isFresh ? " · fresh" : ""}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-[#557393]">
                        {new Date(row.fetchedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-xs text-[#557393]">
                        {new Date(row.expiresAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          Invalidation controls
        </h3>

        {actionError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Invalidate property
            </p>
            <input
              value={identityKey}
              onChange={(e) => setIdentityKey(e.target.value)}
              placeholder="Normalized identity key"
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
            />
            <button
              type="button"
              disabled={invalidate.isPending || !identityKey.trim()}
              onClick={() =>
                runInvalidate(null, {
                  scope: "property",
                  normalizedIdentityKey: identityKey.trim(),
                })
              }
              className="rounded-2xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Invalidate property
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Invalidate category
            </p>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as PropertyDataCategory)
              }
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
            >
              {PROPERTY_DATA_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <input
              value={identityKey}
              onChange={(e) => setIdentityKey(e.target.value)}
              placeholder="Optional identity key (leave blank for all)"
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
            />
            <button
              type="button"
              disabled={invalidate.isPending}
              onClick={() =>
                runInvalidate(
                  identityKey.trim()
                    ? null
                    : `Invalidate all "${CATEGORY_LABELS[category]}" cache entries?`,
                  {
                    scope: "category",
                    category,
                    normalizedIdentityKey: identityKey.trim() || null,
                  }
                )
              }
              className="rounded-2xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Invalidate category
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Invalidate ZIP
            </p>
            <div className="flex gap-2">
              <input
                value={zipCountry}
                onChange={(e) => setZipCountry(e.target.value.toUpperCase())}
                maxLength={2}
                className="w-16 rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
              />
              <input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="ZIP / postal"
                className="flex-1 rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
              />
            </div>
            <button
              type="button"
              disabled={invalidate.isPending || !zipCode.trim()}
              onClick={() =>
                runInvalidate(
                  `Invalidate all cache for ${zipCountry} ${zipCode.trim()}?`,
                  {
                    scope: "zip",
                    countryCode: zipCountry,
                    zipCode: zipCode.trim(),
                  }
                )
              }
              className="rounded-2xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Invalidate ZIP
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Invalidate provider
            </p>
            <input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full rounded-2xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm outline-none focus:border-[#38B2D1]"
            />
            <button
              type="button"
              disabled={invalidate.isPending || !providerId.trim()}
              onClick={() =>
                runInvalidate(
                  `Invalidate all cache for provider "${providerId.trim()}"?`,
                  { scope: "provider", providerId: providerId.trim() }
                )
              }
              className="rounded-2xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              Invalidate provider
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={invalidate.isPending}
          onClick={() =>
            runInvalidate(
              "Invalidate ALL Property Intelligence cache entries? This is broad and cannot be undone. No paid API requests will be triggered.",
              { scope: "all" }
            )
          }
          className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-60"
        >
          Invalidate all property cache
        </button>
      </div>
    </div>
  );
}
