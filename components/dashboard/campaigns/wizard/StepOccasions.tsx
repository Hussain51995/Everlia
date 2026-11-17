"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOccasions } from "@/hooks/campaigns";
import { useCustomers } from "@/hooks/cards";
import { useOrgOccasionMessages } from "@/hooks/campaigns";
import {
  useCampaignWizardStore,
  type WizardOccasionDraft,
} from "@/stores/campaign-wizard-store";
import {
  fieldLabelClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import {
  CalendarIcon,
  CheckIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import { OccasionEditDialog } from "@/components/dashboard/campaigns/wizard/OccasionEditDialog";
import { OccasionPreviewCard } from "@/components/dashboard/campaigns/wizard/OccasionPreviewCard";
import { OccasionsCalendarView } from "@/components/dashboard/campaigns/wizard/OccasionsCalendarView";
import {
  CATEGORY_FILTERS,
  ListViewIcon,
  categoryLabel,
  categoryStyle,
  occasionIcon,
  type TileModel,
} from "@/components/dashboard/campaigns/wizard/occasions-step-shared";
import {
  US_OCCASION_CATALOG,
  type OccasionDefinition,
} from "@/lib/campaigns/occasions";

type ViewMode = "list" | "calendar";

function draftFromCatalog(o: OccasionDefinition): WizardOccasionDraft {
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
}

const CODE_DEFAULT_SLUGS = new Set(
  US_OCCASION_CATALOG.filter(
    (o) => o.isDefaultSelected && o.isActive !== false
  ).map((o) => o.slug)
);

export function StepOccasions() {
  const { data: catalog, isLoading } = useOccasions();
  const { data: customers } = useCustomers();
  const { data: orgMessagesData } = useOrgOccasionMessages();
  const occasions = useCampaignWizardStore((s) => s.occasions);
  const setOccasions = useCampaignWizardStore((s) => s.setOccasions);
  const updateOccasion = useCampaignWizardStore((s) => s.updateOccasion);
  const removeOccasion = useCampaignWizardStore((s) => s.removeOccasion);
  const addOccasion = useCampaignWizardStore((s) => s.addOccasion);
  const optedOutOccasionSlugs = useCampaignWizardStore(
    (s) => s.optedOutOccasionSlugs
  );
  const optOutOccasionSlug = useCampaignWizardStore((s) => s.optOutOccasionSlug);
  const clearOptedOutOccasionSlug = useCampaignWizardStore(
    (s) => s.clearOptedOutOccasionSlug
  );
  const customerIds = useCampaignWizardStore((s) => s.customerIds);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDate, setCustomDate] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  useEffect(() => {
    if (!catalog?.length) return;

    const selectedSlugs = new Set(
      occasions
        .map((o) => o.occasionSlug)
        .filter((slug): slug is string => Boolean(slug))
    );
    const optedOut = new Set(optedOutOccasionSlugs);

    const missingDefaults = catalog.filter(
      (o) =>
        CODE_DEFAULT_SLUGS.has(o.slug) &&
        !selectedSlugs.has(o.slug) &&
        !optedOut.has(o.slug)
    );

    if (!missingDefaults.length) return;
    setOccasions([...occasions, ...missingDefaults.map(draftFromCatalog)]);
  }, [catalog, occasions, optedOutOccasionSlugs, setOccasions]);

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

  const defaultMessageBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of orgMessagesData?.messages ?? []) {
      map.set(row.occasionSlug, row.messageTemplate);
    }
    return map;
  }, [orgMessagesData?.messages]);

  const tiles: TileModel[] = useMemo(() => {
    const bySlug = new Map(
      occasions
        .filter((o) => o.occasionSlug)
        .map((o) => [o.occasionSlug as string, o])
    );
    const catalogTiles: TileModel[] = [...(catalog ?? [])]
      .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100))
      .map((o) => {
        const draft = bySlug.get(o.slug) ?? null;
        return {
          key: o.slug,
          name: o.name,
          category: o.category,
          leadDays: draft?.leadDays ?? o.defaultLeadDays ?? 7,
          isSelected: Boolean(draft),
          isEnabled: draft?.isEnabled ?? false,
          hasMessage: Boolean(draft?.messageTemplate?.trim()),
          exclusionCount: draft?.excludedCustomerIds.length ?? 0,
          draft,
          catalog: o,
          defaultMessagePreview: defaultMessageBySlug.get(o.slug),
        };
      });

    const customTiles: TileModel[] = occasions
      .filter((o) => !o.occasionSlug)
      .map((o) => ({
        key: o.key,
        name: o.name,
        category: o.category ?? "custom",
        leadDays: o.leadDays,
        isSelected: true,
        isEnabled: o.isEnabled,
        hasMessage: Boolean(o.messageTemplate?.trim()),
        exclusionCount: o.excludedCustomerIds.length,
        occurrenceDate: o.occurrenceDate,
        draft: o,
        catalog: null,
        defaultMessagePreview: defaultMessageBySlug.get("custom"),
      }));

    return [...catalogTiles, ...customTiles];
  }, [catalog, occasions, defaultMessageBySlug]);

  const visibleTiles = useMemo(() => {
    if (!categoryFilter) return tiles;
    return tiles.filter((t) => (t.category ?? "custom") === categoryFilter);
  }, [tiles, categoryFilter]);

  useEffect(() => {
    if (!visibleTiles.length) {
      setPreviewKey(null);
      return;
    }
    if (previewKey && visibleTiles.some((t) => t.key === previewKey)) return;
    const preferred =
      visibleTiles.find((t) => t.isSelected && t.isEnabled) ??
      visibleTiles.find((t) => t.isSelected) ??
      visibleTiles[0];
    setPreviewKey(preferred?.key ?? null);
  }, [visibleTiles, previewKey]);

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
  const previewTile =
    visibleTiles.find((t) => t.key === previewKey) ?? null;

  const selectAllVisible = () => {
    const visibleSlugs = new Set(visibleCatalog.map((o) => o.slug));
    for (const slug of visibleSlugs) clearOptedOutOccasionSlug(slug);
    const kept = occasions.filter(
      (o) => !o.occasionSlug || !visibleSlugs.has(o.occasionSlug)
    );
    const selectedVisible: WizardOccasionDraft[] = visibleCatalog.map((o) => {
      const existing = occasions.find((d) => d.occasionSlug === o.slug);
      if (existing) {
        return { ...existing, isEnabled: true };
      }
      return draftFromCatalog(o);
    });
    setOccasions([...kept, ...selectedVisible]);
  };

  const clearVisibleSelection = () => {
    const visibleSlugs = new Set(visibleCatalog.map((o) => o.slug));
    for (const slug of visibleSlugs) optOutOccasionSlug(slug);
    setOccasions(
      occasions.filter(
        (o) => !o.occasionSlug || !visibleSlugs.has(o.occasionSlug)
      )
    );
  };

  const ensureSelected = (tile: TileModel): WizardOccasionDraft | null => {
    if (tile.draft) return tile.draft;
    if (!tile.catalog) return null;
    const o = tile.catalog;
    if (o.slug) clearOptedOutOccasionSlug(o.slug);
    const draft = draftFromCatalog(o);
    addOccasion(draft);
    return draft;
  };

  const toggleSelection = (tile: TileModel) => {
    if (tile.draft) {
      if (!tile.draft.isEnabled) {
        if (tile.draft.occasionSlug) {
          clearOptedOutOccasionSlug(tile.draft.occasionSlug);
        }
        updateOccasion(tile.draft.key, { isEnabled: true });
        return;
      }
      if (tile.draft.occasionSlug) {
        optOutOccasionSlug(tile.draft.occasionSlug);
      }
      removeOccasion(tile.draft.key);
      return;
    }
    ensureSelected(tile);
  };

  const openEditor = (tile: TileModel) => {
    const draft = ensureSelected(tile);
    if (!draft) return;
    setPreviewKey(tile.key);
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
      <div>
        <p className="text-sm text-[#557393]">
          {viewMode === "list"
            ? "Pick occasions to include — select a row for a quick peek, then edit lead time, message, and exclusions."
            : "Scan the campaign year as a calendar — pin holidays and greetings, then fine-tune each occasion."}
        </p>
        <p className="mt-1 text-xs font-bold text-[#0B1F3D]">
          {selectedCount} occasion{selectedCount === 1 ? "" : "s"} selected
        </p>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div
          role="tablist"
          aria-label="Occasion view"
          className="relative inline-flex shrink-0 rounded-full border border-[#C4EBF2] bg-[#F8FBFC] p-1"
        >
          {(
            [
              { id: "list", label: "List", Icon: ListViewIcon },
              { id: "calendar", label: "Calendar", Icon: CalendarIcon },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(id)}
                className={`relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active ? "text-[#0B1F3D]" : "text-[#557393] hover:text-[#0B1F3D]"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="occasions-view-pill"
                    className="absolute inset-0 rounded-full border border-[#38B2D1] bg-white shadow-sm"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={selectAllVisible}
            disabled={!visibleCatalog.length || allVisibleSelected}
            className="whitespace-nowrap rounded-full border border-[#38B2D1] bg-[#F0FAFC] px-3 py-1.5 text-xs font-bold text-[#0B1F3D] transition hover:bg-[#E6F7FB] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="whitespace-nowrap rounded-full border border-[#C4EBF2] bg-white px-3 py-1.5 text-xs font-bold text-[#557393] transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-50"
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

      <AnimatePresence mode="wait" initial={false}>
        {viewMode === "list" ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-5"
          >
            <div className="overflow-hidden rounded-2xl border border-[#C4EBF2] bg-[#F8FBFC]">
              <div className="max-h-[420px] space-y-2 overflow-y-auto p-2.5 sm:p-3">
                {visibleTiles.map((tile) => {
                  const style = categoryStyle(tile.category);
                  const Icon = occasionIcon(tile);
                  const isPreview = previewKey === tile.key;
                  const checked = tile.isSelected && tile.isEnabled;

                  return (
                    <div
                      key={tile.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPreviewKey(tile.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setPreviewKey(tile.key);
                        }
                      }}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border bg-white px-3 py-3 text-left transition ${
                        isPreview
                          ? "border-[#38B2D1] bg-[#F0FAFC] shadow-sm ring-1 ring-[#38B2D1]/25"
                          : "border-[#E8F4F7] hover:border-[#38B2D1]/50 hover:bg-white"
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.iconWrap} ${style.icon}`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#0B1F3D]">
                          {tile.name}
                        </p>
                        <p className="truncate text-xs text-[#557393]">
                          {categoryLabel(tile.category)}
                          {tile.occurrenceDate ? ` · ${tile.occurrenceDate}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={
                          checked
                            ? `Deselect ${tile.name}`
                            : `Select ${tile.name}`
                        }
                        aria-pressed={checked}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewKey(tile.key);
                          toggleSelection(tile);
                        }}
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
                          checked
                            ? "border-[#38B2D1] bg-[#38B2D1] text-white"
                            : "border-[#C4EBF2] bg-white text-transparent hover:border-[#38B2D1]"
                        }`}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {!visibleTiles.length ? (
                  <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-white px-4 py-10 text-center text-sm text-[#557393]">
                    No occasions in this filter.
                  </div>
                ) : null}
              </div>
            </div>

            <OccasionPreviewCard tile={previewTile} onEdit={openEditor} />
          </motion.div>
        ) : (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <OccasionsCalendarView
              tiles={visibleTiles}
              previewKey={previewKey}
              campaignStart={startDate}
              campaignEnd={endDate}
              onPreview={setPreviewKey}
              onToggle={toggleSelection}
              onEdit={openEditor}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-dashed border-[#C4EBF2] bg-[#F8FBFC] p-4">
        <div className="flex items-center gap-2 text-[#38B2D1]">
          <PlusIcon className="h-4 w-4" />
          <p className="text-sm font-bold">Add a custom date</p>
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
                setPreviewKey(key);
                setEditingKey(key);
              }}
            >
              Add date
            </button>
          </div>
        </div>
      </div>

      <OccasionEditDialog
        open={Boolean(editingKey && editingOccasion)}
        occasion={editingOccasion}
        customers={selectedCustomers}
        defaultMessagePreview={
          editingOccasion?.occasionSlug
            ? defaultMessageBySlug.get(editingOccasion.occasionSlug)
            : defaultMessageBySlug.get("custom")
        }
        onClose={() => setEditingKey(null)}
        onSave={(key, patch) => updateOccasion(key, patch)}
        onRemove={(key) => removeOccasion(key)}
      />
    </div>
  );
}
