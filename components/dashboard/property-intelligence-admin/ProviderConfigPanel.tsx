"use client";

import { usePropertyIntelligenceProviders } from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { CheckIcon, AlertCircleIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { CATEGORY_LABELS } from "./labels";

export function ProviderConfigPanel() {
  const providersQuery = usePropertyIntelligenceProviders();

  if (providersQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <ThemeLoader label="Loading providers…" className="py-8" />
      </div>
    );
  }

  if (providersQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
        {providersQuery.error instanceof ApiClientError
          ? providersQuery.error.message
          : "Failed to load providers"}
      </div>
    );
  }

  const providers = providersQuery.data?.providers ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          Provider Configuration
        </h2>
        <p className="mt-1 text-sm text-[#557393]">
          Only registered adapters appear here. Unimplemented providers cannot
          be selected. Secrets are never shown.
        </p>
      </div>

      {providers.map((provider) => (
        <div
          key={provider.id}
          className="space-y-3 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#0B1F3D]">
                {provider.displayName}
              </h3>
              <p className="mt-1 text-sm text-[#557393]">
                {provider.configurationNote}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  provider.configured
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {provider.configured ? "Configured" : "Not configured"}
              </span>
              {provider.isMock ? (
                <span className="rounded-full bg-[#F0FAFC] px-3 py-1 text-xs font-bold text-[#557393]">
                  Dev / test only
                </span>
              ) : null}
              {provider.selectable ? (
                <span className="rounded-full bg-[#E8F7FB] px-3 py-1 text-xs font-bold text-[#0B1F3D]">
                  Selectable
                </span>
              ) : null}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#C4EBF2] text-xs uppercase tracking-wider text-[#557393]">
                  <th className="py-2 pr-4 font-bold">Category</th>
                  <th className="py-2 pr-4 font-bold">Supported</th>
                  <th className="py-2 pr-4 font-bold">Cost units</th>
                  <th className="py-2 pr-4 font-bold">Max DB TTL</th>
                  <th className="py-2 font-bold">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {provider.capabilities.map((cap) => (
                  <tr
                    key={`${provider.id}-${cap.category}`}
                    className="border-b border-[#E8F7FB] last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-medium text-[#0B1F3D]">
                      {CATEGORY_LABELS[cap.category]}
                    </td>
                    <td className="py-2.5 pr-4">
                      {cap.supported ? (
                        <CheckIcon className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertCircleIcon className="h-4 w-4 text-[#9BB3C9]" />
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-[#557393]">
                      {cap.requestCostUnits}
                    </td>
                    <td className="py-2.5 pr-4 text-[#557393]">
                      {cap.maxRedisTtlSeconds == null
                        ? "—"
                        : `${cap.maxRedisTtlSeconds}s`}
                    </td>
                    <td className="py-2.5 text-[#557393]">
                      {cap.endpointCoverage.length
                        ? cap.endpointCoverage.join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
