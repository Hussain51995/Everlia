"use client";

import { useEffect, useMemo, useState } from "react";
import { useOccasions } from "@/hooks/campaigns";
import { useCustomers } from "@/hooks/cards";
import {
  useCampaignWizardStore,
  type WizardOccasionDraft,
} from "@/stores/campaign-wizard-store";
import {
  fieldLabelClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { PlusIcon } from "@/components/ui/Icons";
import { OccasionEditDialog } from "@/components/dashboard/campaigns/wizard/OccasionEditDialog";
import type { OccasionDefinition } from "@/lib/campaigns/occasions";

const CATEGORY_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Holidays", value: "federal_holiday" },
  { label: "Greetings", value: "popular_greeting" },
  { label: "Real estate", value: "real_estate_milestone" },
  { label: "Personal", value: "personal_milestone" },
  { label: "Custom", value: "custom" },
];

const CATEGORY_ACCENT: Record<string, string> = {
  federal_holiday: "from-[#0B1F3D] to-[#1A3A5C]",
  popular_greeting: "from-[#0E7490] to-[#38B2D1]",
  real_estate_milestone: "from-[#0F766E] to-[#14B8A6]",
  personal_milestone: "from-[#9A3412] to-[#EA580C]",
  custom: "from-[#4C1D95] to-[#7C3AED]",
};

function categoryLabel(category?: string) {
  return (category ?? "custom").replace(/_/g, " ");
}

function shortKind(kind?: string) {
  if (!kind) return "Occasion";
  if (kind === "fixed_calendar") return "Fixed date";
  if (kind === "relative_calendar") return "Floating date";
  if (kind === "customer_milestone") return "Per customer";
  return "Custom";
}

type TileModel = {
  key: string;
  name: string;
  category?: string;
  kindHint: string;
  leadDays: number;
  isSelected: boolean;
  isEnabled: boolean;
  hasMessage: boolean;
  exclusionCount: number;
  occurrenceDate?: string;
  draft: WizardOccasionDraft | null;
  catalog: OccasionDefinition | null;
};

export function StepOccasions() {
  const { data: catalog, isLoading } = useOccasions();
  const { data: customers } = useCustomers();
  const occasions = useCampaignWizardStore((s) => s.occasions);
  const setOccasions = useCampaignWizardStore((s) => s.setOccasions);
  const updateOccasion = useCampaignWizardStore((s) => s.updateOccasion);
  const removeOccasion = useCampaignWizardStore((s) => s.removeOccasion);
  const addOccasion = useCampaignWizardStore((s) => s.addOccasion);
  const customerIds = useCampaignWizardStore((s) => s.customerIds);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    if (!catalog?.length || occasions.length > 0) return;
    const defaults: WizardOccasionDraft[] = catalog
      .filter((o) => o.isDefaultSelected)
      .map((o) => ({
        key: o.slug,
        occasionId: o.id,
        occasionSlug: o.slug,
        name: o.name,
        category: o.category,
        leadDays: o.defaultLeadDays ?? 7,
        isEnabled: true,
        excludedCustomerIds: [],
      }));
    setOccasions(defaults);
  }, [catalog, occasions.length, setOccasions]);

  const selectedCustomers = useMemo(() => {
    const set = new Set(customerIds);
    return (customers ?? [])
      .filter((c) => set.has(c.id))
      .map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
      }));
  }, [customers, customerIds]);

  const tiles: TileModel[] = useMemo(() => {
    const bySlug = new Map(
      occasions
        .filter((o) => o.occasionSlug)
        .map((o) => [o.occasionSlug as string, o])
    );
    const catalogTiles: TileModel[] = (catalog ?? []).map((o) => {
      const draft = bySlug.get(o.slug) ?? null;
      return {
        key: o.slug,
        name: o.name,
        category: o.category,
        kindHint: shortKind(o.kind),
        leadDays: draft?.leadDays ?? o.defaultLeadDays ?? 7,
        isSelected: Boolean(draft),
        isEnabled: draft?.isEnabled ?? false,
        hasMessage: Boolean(draft?.messageTemplate?.trim()),
        exclusionCount: draft?.excludedCustomerIds.length ?? 0,
        draft,
        catalog: o,
      };
    });

    const customTiles: TileModel[] = occasions
      .filter((o) => !o.occasionSlug)
      .map((o) => ({
        key: o.key,
        name: o.name,
        category: o.category ?? "custom",
        kindHint: o.occurrenceDate ?? "Custom date",
        leadDays: o.leadDays,
        isSelected: true,
        isEnabled: o.isEnabled,
        hasMessage: Boolean(o.messageTemplate?.trim()),
        exclusionCount: o.excludedCustomerIds.length,
        occurrenceDate: o.occurrenceDate,
        draft: o,
        catalog: null,
      }));

    return [...catalogTiles, ...customTiles];
  }, [catalog, occasions]);

  const visibleTiles = useMemo(() => {
    if (!categoryFilter) return tiles;
    return tiles.filter((t) => (t.category ?? "custom") === categoryFilter);
  }, [tiles, categoryFilter]);

  const selectedCount = occasions.filter((o) => o.isEnabled).length;
  const visibleCatalog = useMemo(
    () =>
      visibleTiles
        .map((t) => t.catalog)
        .filter((o): o is OccasionDefinition => Boolean(o)),
    [visibleTiles]
  );
  const allVisibleSelected =
    visibleCatalog.length > 0 &&
    visibleCatalog.every((o) =>
      occasions.some((d) => d.occasionSlug === o.slug && d.isEnabled)
    );
  const editingOccasion =
    occasions.find((o) => o.key === editingKey) ?? null;

  const selectAllVisible = () => {
    const visibleSlugs = new Set(visibleCatalog.map((o) => o.slug));
    const kept = occasions.filter(
      (o) => !o.occasionSlug || !visibleSlugs.has(o.occasionSlug)
    );
    const selectedVisible: WizardOccasionDraft[] = visibleCatalog.map((o) => {
      const existing = occasions.find((d) => d.occasionSlug === o.slug);
      if (existing) {
        return { ...existing, isEnabled: true };
      }
      return {
        key: o.slug,
        occasionId: o.id,
        occasionSlug: o.slug,
        name: o.name,
        category: o.category,
        leadDays: o.defaultLeadDays ?? 7,
        isEnabled: true,
        excludedCustomerIds: [],
      };
    });
    setOccasions([...kept, ...selectedVisible]);
  };

  const clearVisibleSelection = () => {
    const visibleSlugs = new Set(visibleCatalog.map((o) => o.slug));
    setOccasions(
      occasions.filter(
        (o) => !o.occasionSlug || !visibleSlugs.has(o.occasionSlug)
      )
    );
  };

  const ensureAndEdit = (tile: TileModel) => {
    if (tile.draft) {
      setEditingKey(tile.draft.key);
      return;
    }
    if (!tile.catalog) return;
    const o = tile.catalog;
    const draft: WizardOccasionDraft = {
      key: o.slug,
      occasionId: o.id,
      occasionSlug: o.slug,
      name: o.name,
      category: o.category,
      leadDays: o.defaultLeadDays ?? 7,
      isEnabled: true,
      excludedCustomerIds: [],
    };
    addOccasion(draft);
    setEditingKey(draft.key);
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[180px] place-items-center">
        <ThemeLoader label="Loading occasions…" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-[#557393]">
            Pick occasions as tiles. Hover for a quick peek — click to edit lead
            time, message, and exclusions.
          </p>
          <p className="mt-1 text-xs font-bold text-[#0B1F3D]">
            {selectedCount} enabled · {occasions.length} selected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllVisible}
            disabled={!visibleCatalog.length || allVisibleSelected}
            className="rounded-full border border-[#38B2D1] bg-[#F0FAFC] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] transition hover:bg-[#E6F7FB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select all
            {categoryFilter ? ` (${visibleCatalog.length})` : ""}
          </button>
          <button
            type="button"
            onClick={clearVisibleSelection}
            disabled={!visibleCatalog.some((o) =>
              occasions.some((d) => d.occasionSlug === o.slug)
            )}
            className="rounded-full border border-[#C4EBF2] bg-white px-3 py-1.5 text-xs font-bold text-[#557393] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setCategoryFilter(f.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              categoryFilter === f.value
                ? "border-[#38B2D1] bg-[#F0FAFC] text-[#0B1F3D]"
                : "border-[#C4EBF2] text-[#557393] hover:bg-[#F0FAFC]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleTiles.map((tile) => {
          const accent =
            CATEGORY_ACCENT[tile.category ?? "custom"] ??
            CATEGORY_ACCENT.custom;
          const showTip = hoveredKey === tile.key;

          return (
            <div
              key={tile.key}
              className="relative"
              onMouseEnter={() => setHoveredKey(tile.key)}
              onMouseLeave={() =>
                setHoveredKey((k) => (k === tile.key ? null : k))
              }
            >
              <button
                type="button"
                onClick={() => ensureAndEdit(tile)}
                className={`group relative flex aspect-square w-full flex-col overflow-hidden rounded-2xl border text-left transition ${
                  tile.isSelected && tile.isEnabled
                    ? "border-[#38B2D1] bg-white shadow-sm ring-2 ring-[#38B2D1]/30"
                    : tile.isSelected
                      ? "border-dashed border-[#C4EBF2] bg-[#F8FBFC] opacity-80"
                      : "border-[#C4EBF2] bg-white hover:border-[#38B2D1]/60 hover:shadow-sm"
                }`}
              >
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${accent}`}
                  aria-hidden
                />
                <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3">
                  <div>
                    <p className="line-clamp-2 text-[12px] font-black leading-snug text-[#0B1F3D] sm:text-[13px]">
                      {tile.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] capitalize text-[#557393]">
                      {categoryLabel(tile.category)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="rounded-md bg-[#F0FAFC] px-1.5 py-0.5 text-[10px] font-bold text-[#0B1F3D]">
                      {tile.leadDays}d lead
                    </span>
                    {tile.isSelected ? (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          tile.isEnabled ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={tile.isEnabled ? "Enabled" : "Disabled"}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-[#38B2D1]">
                        Add
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {showTip ? (
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-56 -translate-x-1/2 rounded-2xl border border-[#C4EBF2] bg-[#0B1F3D] p-3 text-white shadow-xl">
                  <p className="text-xs font-black">{tile.name}</p>
                  <p className="mt-1 text-[10px] capitalize text-white/70">
                    {categoryLabel(tile.category)} · {tile.kindHint}
                  </p>
                  <ul className="mt-2 space-y-1 text-[10px] text-white/85">
                    <li>
                      {tile.isSelected
                        ? tile.isEnabled
                          ? "Included in campaign"
                          : "Selected but disabled"
                        : "Not selected yet"}
                    </li>
                    <li>Lead days: {tile.leadDays}</li>
                    {tile.occurrenceDate ? (
                      <li>Date: {tile.occurrenceDate}</li>
                    ) : null}
                    {tile.hasMessage ? <li>Custom message set</li> : null}
                    {tile.exclusionCount > 0 ? (
                      <li>{tile.exclusionCount} customer exclusion(s)</li>
                    ) : null}
                  </ul>
                  <p className="mt-2 text-[10px] font-bold text-[#38B2D1]">
                    Click to {tile.isSelected ? "edit" : "add & edit"}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!visibleTiles.length ? (
        <div className="rounded-2xl border border-dashed border-[#C4EBF2] px-4 py-8 text-center text-sm text-[#557393]">
          No occasions in this filter.
        </div>
      ) : null}

      <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-[#F8FBFC] p-4">
        <div className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4 text-[#38B2D1]" />
          <p className="text-sm font-bold text-[#0B1F3D]">Add a custom date</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div>
            <label className={fieldLabelClass} htmlFor="custom-occ-name">
              Label
            </label>
            <input
              id="custom-occ-name"
              className={textInputClass}
              placeholder="e.g. Client appreciation day"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabelClass} htmlFor="custom-occ-date">
              Date
            </label>
            <input
              id="custom-occ-date"
              type="date"
              className={textInputClass}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="inline-flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-[#0B1F3D] px-4 text-xs font-bold text-white sm:w-auto"
              onClick={() => {
                if (!customName.trim() || !customDate) return;
                const key = `custom-${customDate}-${Date.now()}`;
                const draft: WizardOccasionDraft = {
                  key,
                  customName: customName.trim(),
                  name: customName.trim(),
                  occurrenceDate: customDate,
                  category: "custom",
                  leadDays: 7,
                  isEnabled: true,
                  excludedCustomerIds: [],
                };
                addOccasion(draft);
                setCustomName("");
                setCustomDate("");
                setEditingKey(key);
              }}
            >
              Add & edit
            </button>
          </div>
        </div>
      </div>

      <OccasionEditDialog
        open={Boolean(editingKey && editingOccasion)}
        occasion={editingOccasion}
        customers={selectedCustomers}
        onClose={() => setEditingKey(null)}
        onSave={(key, patch) => updateOccasion(key, patch)}
        onRemove={(key) => removeOccasion(key)}
      />
    </div>
  );
}
