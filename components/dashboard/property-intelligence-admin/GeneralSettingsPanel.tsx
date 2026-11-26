"use client";

import { useEffect, useState } from "react";
import {
  usePropertyIntelligenceRedisHealth,
  usePropertyIntelligenceSettings,
  useUpdatePropertyIntelligenceSettings,
} from "@/hooks/admin";
import { ApiClientError } from "@/lib/api/client";
import { AlertCircleIcon, CheckIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useToast } from "@/components/ui/Toast";
import type { AdminProviderStatus } from "@/lib/property-intelligence/admin/provider-catalog";

function RedisStatusBadge({
  status,
}: {
  status: "connected" | "not_configured" | "temporarily_unavailable";
}) {
  const styles =
    status === "connected"
      ? "bg-emerald-50 text-emerald-700"
      : status === "not_configured"
        ? "bg-amber-50 text-amber-800"
        : "bg-rose-50 text-rose-700";
  const label =
    status === "connected"
      ? "Connected"
      : status === "not_configured"
        ? "Not configured"
        : "Temporarily unavailable";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles}`}>
      {label}
    </span>
  );
}

export function GeneralSettingsPanel() {
  const { showToast } = useToast();
  const settingsQuery = usePropertyIntelligenceSettings();
  const updateSettings = useUpdatePropertyIntelligenceSettings();
  const [liveHealthEnabled, setLiveHealthEnabled] = useState(false);
  const redisHealth = usePropertyIntelligenceRedisHealth(liveHealthEnabled);

  const [featureEnabled, setFeatureEnabled] = useState(false);
  const [browserCachingEnabled, setBrowserCachingEnabled] = useState(true);
  const [monthlyApiBudget, setMonthlyApiBudget] = useState(500);
  const [defaultProviderId, setDefaultProviderId] = useState("rentcast");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const g = settingsQuery.data?.settings.global;
    if (!g) return;
    setFeatureEnabled(g.featureEnabled);
    setBrowserCachingEnabled(g.browserCachingEnabled);
    setMonthlyApiBudget(g.monthlyApiBudget);
    setDefaultProviderId(String(g.defaultProviderId || "rentcast"));
  }, [settingsQuery.data]);

  const providers: AdminProviderStatus[] =
    settingsQuery.data?.providers ?? [];

  const redis =
    redisHealth.data?.redis ?? settingsQuery.data?.redis ?? null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!Number.isFinite(monthlyApiBudget) || monthlyApiBudget < 0) {
      setFormError("Monthly API budget must be zero or greater");
      return;
    }

    updateSettings.mutate(
      {
        global: {
          featureEnabled,
          browserCachingEnabled,
          monthlyApiBudget: Math.floor(monthlyApiBudget),
          defaultProviderId,
        },
      },
      {
        onSuccess: (data) => {
          showToast({
            tone: "success",
            title: "Settings saved",
            description: `Config version is now ${data.settings.global.configVersion}. No provider requests were triggered.`,
          });
        },
        onError: (error) => {
          setFormError(
            error instanceof ApiClientError
              ? error.message
              : "Failed to update settings"
          );
        },
      }
    );
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm">
        <ThemeLoader label="Loading general settings…" className="py-8" />
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
        {settingsQuery.error instanceof ApiClientError
          ? settingsQuery.error.message
          : "Failed to load settings"}
      </div>
    );
  }

  const global = settingsQuery.data!.settings.global;

  return (
    <form
      onSubmit={handleSave}
      className="space-y-5 rounded-3xl border border-[#C4EBF2] bg-white p-5 shadow-sm"
    >
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B1F3D]">
          General Settings
        </h2>
        <p className="mt-1 text-sm text-[#557393]">
          Feature flags and request budget. Live provider enablement remains
          separately gated. Config version: {global.configVersion}.
        </p>
      </div>

      {formError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
              Cache infrastructure
            </h3>
            <p className="mt-1 text-sm font-semibold text-[#0B1F3D]">
              Upstash Redis
            </p>
          </div>
          {redis ? <RedisStatusBadge status={redis.status} /> : null}
        </div>
        <p className="text-xs text-[#557393]">
          {redis?.note ??
            "Configuration status loads with settings. Credentials are never displayed."}
        </p>
        {redis?.environment ? (
          <p className="text-xs text-[#557393]">
            Environment namespace:{" "}
            <span className="font-semibold text-[#0B1F3D]">
              {redis.environment}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setLiveHealthEnabled(true);
              void redisHealth.refetch();
            }}
            disabled={redisHealth.isFetching}
            className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-1.5 text-xs font-bold text-[#0B1F3D] disabled:opacity-60"
          >
            {redisHealth.isFetching ? "Checking…" : "Run live health check"}
          </button>
          {redis?.dashboardUrl ? (
            <a
              href={redis.dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#C4EBF2] bg-white px-3 py-1.5 text-xs font-bold text-[#38B2D1]"
            >
              Open Upstash dashboard
            </a>
          ) : null}
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3">
        <span className="text-sm font-semibold text-[#0B1F3D]">
          Enable Property Intelligence
        </span>
        <input
          type="checkbox"
          checked={featureEnabled}
          onChange={(e) => setFeatureEnabled(e.target.checked)}
          className="h-4 w-4 accent-[#38B2D1]"
        />
      </label>

      <label className="flex items-center justify-between gap-4 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3">
        <span className="text-sm font-semibold text-[#0B1F3D]">
          Enable browser caching (L1)
        </span>
        <input
          type="checkbox"
          checked={browserCachingEnabled}
          onChange={(e) => setBrowserCachingEnabled(e.target.checked)}
          className="h-4 w-4 accent-[#38B2D1]"
        />
      </label>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Monthly API request budget
        </label>
        <input
          type="number"
          min={0}
          step={1}
          value={monthlyApiBudget}
          onChange={(e) => setMonthlyApiBudget(Number(e.target.value))}
          className="mt-1 w-full max-w-xs rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
        />
        <p className="mt-1 text-xs text-[#557393]">
          Application-local budget units for the current billing period.
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Default provider
        </label>
        <select
          value={defaultProviderId}
          onChange={(e) => setDefaultProviderId(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] px-4 py-3 text-sm font-medium text-[#0B1F3D] outline-none focus:border-[#38B2D1] focus:bg-white"
        >
          {providers
            .filter((p) => p.selectable)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
                {p.isMock ? " (dev/test)" : ""}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
          Provider account configuration
        </h3>
        <p className="text-xs text-[#557393]">
          Status only — API credentials are never displayed.
        </p>
        <ul className="space-y-2">
          {providers.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-2 text-sm text-[#0B1F3D]"
            >
              {p.configured ? (
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <span>
                <span className="font-semibold">{p.displayName}:</span>{" "}
                {p.configurationNote}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={updateSettings.isPending}
        className="inline-flex min-h-[42px] items-center justify-center rounded-2xl bg-[#38B2D1] px-5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#2ca0be] disabled:opacity-70"
      >
        {updateSettings.isPending ? "Saving…" : "Save general settings"}
      </button>
    </form>
  );
}
