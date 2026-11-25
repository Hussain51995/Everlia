"use client";


import { useState, useCallback, useEffect } from "react";
import type { RentCastCategory, TesterResponse } from "@/lib/rentcast/client";

interface UsageStats {
  monthKey: string;
  budget: number;
  used: number;
  remaining: number;
}

type CategoryMeta = {
  key: RentCastCategory;
  label: string;
  description: string;
};

const ALL_CATEGORIES: CategoryMeta[] = [
  {
    key: "propertyDetails",
    label: "Property Details",
    description: "Address, type, beds/baths, sqft, lot, year built, coordinates",
  },
  {
    key: "valuation",
    label: "Property Valuation",
    description: "Estimated value, price range, comparable sales",
  },
  {
    key: "nearbyHouses",
    label: "Nearby Houses for Sale",
    description: "Active residential listings within 1 mile",
  },
  {
    key: "nearbyLand",
    label: "Nearby Vacant Land",
    description: "Active land listings within 5 miles (uses propertyType=Land)",
  },
  {
    key: "marketStatistics",
    label: "Neighborhood Market Statistics",
    description:
      "Median/avg price, days on market, active listings by ZIP code",
  },
];

function StatusBadge({ status }: { status: "success" | "error" | "skipped" }) {
  const styles = {
    success: "bg-emerald-100 text-emerald-800",
    error: "bg-rose-100 text-rose-700",
    skipped: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-[#C4EBF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#38B2D1] transition hover:bg-[#F0FAFC] active:scale-95"
    >
      {copied ? "Copied!" : "Copy JSON"}
    </button>
  );
}

type CategoryResultEntry = TesterResponse["results"][RentCastCategory];

function CategoryPanel({
  meta,
  result,
}: {
  meta: CategoryMeta;
  result: CategoryResultEntry | undefined;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!result) return null;

  const json = JSON.stringify(result.data, null, 2);

  return (
    <div className="rounded-2xl border border-[#C4EBF2] bg-white overflow-hidden">
      <div
        className="flex cursor-pointer items-center justify-between px-5 py-3.5 hover:bg-[#F0FAFC]"
        onClick={() => setExpanded((p) => !p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-[#0B1F3D]/40 select-none">
            {expanded ? "▼" : "▶"}
          </span>
          <span className="text-sm font-bold text-[#0B1F3D]">{meta.label}</span>
          <StatusBadge status={result.status} />
          {result.httpStatus !== null && (
            <span className="text-[11px] text-[#0B1F3D]/50">
              HTTP {result.httpStatus}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <CopyButton text={JSON.stringify(result, null, 2)} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#C4EBF2] px-5 pb-5 pt-4 space-y-3">
          <div className="flex flex-wrap gap-4 text-[11px] text-[#0B1F3D]/60">
            <span>
              <span className="font-semibold">Endpoint:</span>{" "}
              <code className="text-[10px]">{result.endpoint}</code>
            </span>
            <span>
              <span className="font-semibold">Requested at:</span>{" "}
              {result.requestedAt}
            </span>
          </div>

          <div>
            <div className="mb-1 text-[11px] font-semibold text-[#0B1F3D]/60">
              Parameters sent:
            </div>
            <pre className="overflow-x-auto rounded-xl bg-[#F0FAFC] p-3 text-[11px] text-[#0B1F3D]">
              {JSON.stringify(result.parameters, null, 2)}
            </pre>
          </div>

          {result.errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              <span className="font-semibold">Error:</span> {result.errorMessage}
            </div>
          )}

          <div>
            <div className="mb-1 text-[11px] font-semibold text-[#0B1F3D]/60">
              Response data:
            </div>
            {result.data === null || result.data === undefined ? (
              <div className="rounded-xl bg-[#F0FAFC] px-4 py-3 text-[12px] text-[#0B1F3D]/50 italic">
                No data returned.
              </div>
            ) : (
              <pre className="overflow-x-auto rounded-xl bg-[#0B1F3D] p-4 text-[11px] text-[#C4EBF2] leading-relaxed max-h-96">
                {json}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export function RentCastTester() {
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<
    Set<RentCastCategory>
  >(new Set(["propertyDetails"]));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TesterResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    setUsageLoading(true);
    fetch("/api/admin/rentcast")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUsage(json.data);
      })
      .catch(() => { })
      .finally(() => setUsageLoading(false));
  }, []);

  const refreshUsage = useCallback(() => {
    fetch("/api/admin/rentcast")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUsage(json.data);
      })
      .catch(() => { });
  }, []);

  const toggleCategory = (key: RentCastCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const estimatedCalls = selectedCategories.size;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = address.trim();
    if (!trimmed) {
      setAddressError("Property address is required.");
      return;
    }
    setAddressError("");

    if (selectedCategories.size === 0) {
      setFetchError("Please select at least one data category.");
      return;
    }

    setLoading(true);
    setResult(null);
    setFetchError(null);

    try {
      const response = await fetch("/api/admin/rentcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: trimmed,
          categories: Array.from(selectedCategories),
        }),
      });

      const json = await response.json();

      if (!json.success) {
        setFetchError(
          json.error?.message ?? "An unexpected error occurred."
        );
      } else {
        setResult(json.data as TesterResponse);
        refreshUsage();
      }
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rentcast-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F3D]">
          RentCast API Tester
        </h1>
        <p className="mt-1 text-sm text-[#0B1F3D]/60">
          Enter a US property address to retrieve and inspect property data from
          RentCast. This is an isolated proof-of-concept — no data is saved.
        </p>
      </div>

      <div className="rounded-2xl border border-[#C4EBF2] bg-white p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-[#0B1F3D]/50">
          Tester API Budget (this month)
        </div>
        {usageLoading ? (
          <div className="text-sm text-[#0B1F3D]/50 italic">
            Loading usage…
          </div>
        ) : usage ? (
          <div className="flex flex-wrap gap-6">
            <Stat label="Configured budget" value={`${usage.budget} calls`} />
            <Stat label="Used this month" value={`${usage.used} calls`} />
            <Stat
              label="Estimated remaining"
              value={`${usage.remaining} calls`}
              warn={usage.remaining < 10}
            />
            <Stat label="Billing period" value={usage.monthKey} />
          </div>
        ) : (
          <div className="text-sm text-rose-600">
            Could not load usage data. Check server logs.
          </div>
        )}
        <p className="mt-3 text-[11px] text-[#0B1F3D]/40">
          ⚠ This counter tracks requests made by this tester only. It does not
          reflect your authoritative RentCast account balance. Configure via{" "}
          <code className="text-[10px]">RENTCAST_TEST_MONTHLY_BUDGET</code>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#C4EBF2] bg-white p-5 space-y-5"
      >
        <div>
          <label
            htmlFor="rc-address"
            className="mb-1.5 block text-sm font-semibold text-[#0B1F3D]"
          >
            Property Address
          </label>
          <input
            id="rc-address"
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (e.target.value.trim()) setAddressError("");
            }}
            placeholder="123 Main St, Austin, TX 78701"
            disabled={loading}
            autoComplete="off"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm text-[#0B1F3D] outline-none transition placeholder:text-[#0B1F3D]/30 disabled:cursor-not-allowed disabled:opacity-60 ${addressError
              ? "border-rose-400 bg-rose-50 focus:border-rose-500"
              : "border-[#C4EBF2] bg-[#F0FAFC] focus:border-[#38B2D1] focus:ring-2 focus:ring-[#38B2D1]/20"
              }`}
          />
          {addressError && (
            <p className="mt-1.5 text-xs text-rose-600">{addressError}</p>
          )}
          <p className="mt-1.5 text-[11px] text-[#0B1F3D]/50">
            Use a full US address: Street, City, State, ZIP (e.g. 123 Main St,
            Austin, TX 78701)
          </p>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-[#0B1F3D]">
            Data Categories
          </div>
          <div className="space-y-2">
            {ALL_CATEGORIES.map((cat) => (
              <label
                key={cat.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 transition hover:border-[#38B2D1] hover:bg-[#E8F8FC]"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.has(cat.key)}
                  onChange={() => toggleCategory(cat.key)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border-[#C4EBF2] accent-[#38B2D1]"
                />
                <div>
                  <div className="text-sm font-semibold text-[#0B1F3D]">
                    {cat.label}
                  </div>
                  <div className="text-[11px] text-[#0B1F3D]/60">
                    {cat.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#C4EBF2] pt-4">
          <div className="text-sm text-[#0B1F3D]/70">
            {selectedCategories.size === 0 ? (
              <span className="text-rose-500">
                Select at least one category.
              </span>
            ) : (
              <>
                This test will make{" "}
                <span className="font-bold text-[#38B2D1]">
                  {estimatedCalls}
                </span>{" "}
                RentCast API{" "}
                {estimatedCalls === 1 ? "call" : "calls"}.
                {usage && usage.remaining < estimatedCalls && (
                  <span className="ml-2 text-rose-600 font-semibold">
                    ⚠ Insufficient budget remaining.
                  </span>
                )}
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || selectedCategories.size === 0}
            className="flex items-center gap-2 rounded-xl bg-[#38B2D1] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#38B2D1]/20 transition-all hover:bg-[#43c5e6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {loading ? "Fetching Data…" : "Fetch Property Data"}
          </button>
        </div>
      </form>

      {fetchError && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <span className="font-bold">Error: </span>
          {fetchError}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B1F3D]">Results</h2>
              <p className="text-xs text-[#0B1F3D]/50">
                Address: <span className="font-semibold">{result.inputAddress}</span>{" "}
                · Requested at: {result.requestedAt}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton text={JSON.stringify(result, null, 2)} />
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg border border-[#C4EBF2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#38B2D1] transition hover:bg-[#F0FAFC] active:scale-95"
              >
                Download .json
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard
              label="Successful"
              value={result.summary.successfulRequests}
              color="emerald"
            />
            <SummaryCard
              label="Failed"
              value={result.summary.failedRequests}
              color="rose"
            />
            <SummaryCard
              label="Skipped"
              value={result.summary.skippedRequests}
              color="amber"
            />
            <SummaryCard
              label="Total calls"
              value={result.summary.totalRequests}
              color="blue"
            />
          </div>

          {ALL_CATEGORIES.map((cat) => (
            <CategoryPanel
              key={cat.key}
              meta={cat}
              result={result.results[cat.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#0B1F3D]/50">
        {label}
      </div>
      <div
        className={`text-lg font-bold ${warn ? "text-rose-600" : "text-[#0B1F3D]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "rose" | "amber" | "blue";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-[#C4EBF2] bg-[#F0FAFC] text-[#0B1F3D]",
  };
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${styles[color]}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
    </div>
  );
}
