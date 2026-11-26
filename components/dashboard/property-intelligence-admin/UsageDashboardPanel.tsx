"use client";

import { usePropertyIntelligenceUsage } from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import type { PropertyIntelligenceUsageMetric } from "@/hooks/admin/use-property-intelligence";

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

function MetricCard({
  label,
  metric,
}: {
  label: string;
  metric: PropertyIntelligenceUsageMetric;
}) {
  if (!metric.available) {
    return (
      <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#557393]">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold text-[#0B1F3D]">Not measured</p>
        <p className="mt-1 text-xs text-[#557393]">{metric.note}</p>
      </div>
    );
  }
  return (
    <StatCard
      label={label}
      value={metric.value ?? "—"}
      hint={metric.note}
    />
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
  const metrics = data.cacheMetrics;
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
        <MetricCard label="API budget used" metric={metrics.apiBudgetUsed} />
        <MetricCard
          label="API budget remaining"
          metric={metrics.apiBudgetRemaining}
        />
        <MetricCard
          label="External provider requests"
          metric={metrics.externalProviderRequests}
        />
        <MetricCard label="Requests avoided" metric={metrics.requestsAvoided} />
        <MetricCard
          label="Deduplicated requests"
          metric={metrics.deduplicatedRequests}
        />
        <MetricCard label="Browser cache hits" metric={metrics.browserCacheHits} />
        <MetricCard
          label="Browser cache misses"
          metric={metrics.browserCacheMisses}
        />
        <MetricCard label="Redis cache hits" metric={metrics.redisCacheHits} />
        <MetricCard
          label="Redis cache misses"
          metric={metrics.redisCacheMisses}
        />
        <MetricCard
          label="Redis cache hit rate"
          metric={metrics.redisCacheHitRate}
        />
        <MetricCard
          label="Redis connection failures"
          metric={metrics.redisConnectionFailures}
        />
        <MetricCard
          label="Redis write failures"
          metric={metrics.redisWriteFailures}
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

      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
              Upstash infrastructure
            </h3>
            <p className="mt-1 text-sm text-[#557393]">
              Detailed storage, command, bandwidth, and eviction metrics are not
              exposed inside Everlia.
            </p>
          </div>
          <a
            href={data.upstashInfrastructure.dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-[#0B1F3D] px-4 py-2 text-xs font-bold text-white"
          >
            Open Upstash dashboard
          </a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Storage usage"
            metric={data.upstashInfrastructure.storageUsage}
          />
          <MetricCard
            label="Command usage"
            metric={data.upstashInfrastructure.commandUsage}
          />
          <MetricCard
            label="Bandwidth usage"
            metric={data.upstashInfrastructure.bandwidthUsage}
          />
          <MetricCard
            label="Evicted keys"
            metric={data.upstashInfrastructure.evictedKeys}
          />
        </div>
      </div>
    </div>
  );
}
