"use client";

import { usePropertyIntelligenceUsage } from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { ThemeLoader } from "@/components/ui/ThemeLoader";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#557393]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-[#0B1F3D]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#557393]">{hint}</p> : null}
    </div>
  );
}

function UnavailableMetric({
  label,
  note,
}: {
  label: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#557393]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#0B1F3D]">Not measured</p>
      <p className="mt-1 text-xs text-[#557393]">{note}</p>
    </div>
  );
}

export function UsageDashboardPanel() {
  const usageQuery = usePropertyIntelligenceUsage();

  if (usageQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <ThemeLoader label="Loading usage…" className="py-8" />
      </div>
    );
  }

  if (usageQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
        {usageQuery.error instanceof ApiClientError
          ? usageQuery.error.message
          : "Failed to load usage dashboard"}
      </div>
    );
  }

  const data = usageQuery.data!;
  const local = data.applicationLocal;
  const byProvider = Object.entries(local.byProvider);
  const byOperation = Object.entries(local.byOperation);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          API Usage & Performance
        </h2>
        <p className="mt-1 text-sm text-[#557393]">{data.note}</p>
        <p className="mt-2 text-xs font-medium text-[#557393]">
          {local.label}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Billing period" value={data.billingPeriod} />
        <StatCard
          label="Configured budget"
          value={data.configuredBudget}
          hint="Application-local units"
        />
        <StatCard
          label="Units consumed"
          value={local.unitsConsumed}
          hint="Measured (Everlia counters)"
        />
        <StatCard
          label="Units reserved"
          value={local.unitsReserved}
          hint="Measured (Everlia counters)"
        />
        <StatCard
          label="Remaining"
          value={local.remaining}
          hint="Budget − reserved"
        />
        <StatCard
          label="Successful requests"
          value={local.successfulRequests}
        />
        <StatCard label="Failed requests" value={local.failedRequests} />
        <StatCard
          label="Blocked by budget"
          value={local.budgetBlockedRequests}
        />
        <StatCard label="Skipped" value={local.skippedRequests} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            By provider
          </h3>
          {byProvider.length === 0 ? (
            <p className="mt-3 text-sm text-[#557393]">
              No usage rows for this billing period.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {byProvider.map(([id, stats]) => (
                <li
                  key={id}
                  className="rounded-2xl border border-[#E8F7FB] px-3 py-2 text-sm text-[#0B1F3D]"
                >
                  <span className="font-bold">{id}</span>
                  <span className="text-[#557393]">
                    {" "}
                    · consumed {stats.consumed} · reserved {stats.reserved} · ok{" "}
                    {stats.succeeded} · fail {stats.failed} · budget{" "}
                    {stats.budgetDenied}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
            By operation
          </h3>
          {byOperation.length === 0 ? (
            <p className="mt-3 text-sm text-[#557393]">
              No operations recorded yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {byOperation.map(([op, stats]) => (
                <li
                  key={op}
                  className="rounded-2xl border border-[#E8F7FB] px-3 py-2 text-sm text-[#0B1F3D]"
                >
                  <span className="font-bold">{op}</span>
                  <span className="text-[#557393]">
                    {" "}
                    · {stats.count} · ok {stats.succeeded} · fail {stats.failed}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(data.measuredServerSide).map(([key, meta]) => (
          <UnavailableMetric
            key={key}
            label={key.replace(/([A-Z])/g, " $1")}
            note={meta.note}
          />
        ))}
        {Object.entries(data.notMeasuredServerSide).map(([key, meta]) => (
          <UnavailableMetric
            key={key}
            label={key.replace(/([A-Z])/g, " $1")}
            note={meta.note}
          />
        ))}
      </div>
    </div>
  );
}
