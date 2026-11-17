"use client";

import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon } from "@/components/ui/Icons";
import type { WizardOccasionDraft } from "@/stores/campaign-wizard-store";
import {
  fieldLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";

type CustomerOption = {
  id: string;
  first_name: string;
  last_name: string;
};

type Props = {
  open: boolean;
  occasion: WizardOccasionDraft | null;
  customers: CustomerOption[];
  defaultMessagePreview?: string | null;
  onClose: () => void;
  onSave: (key: string, patch: Partial<WizardOccasionDraft>) => void;
  onRemove: (key: string) => void;
};

export function OccasionEditDialog({
  open,
  occasion,
  customers,
  defaultMessagePreview,
  onClose,
  onSave,
  onRemove,
}: Props) {
  const titleId = useId();
  const [leadDays, setLeadDays] = useState(7);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [excludedCustomerIds, setExcludedCustomerIds] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");
  const [occurrenceDate, setOccurrenceDate] = useState("");

  useEffect(() => {
    if (!occasion) return;
    setLeadDays(occasion.leadDays);
    setMessageTemplate(occasion.messageTemplate ?? "");
    setIsEnabled(occasion.isEnabled);
    setExcludedCustomerIds(occasion.excludedCustomerIds);
    setCustomName(occasion.customName ?? occasion.name);
    setOccurrenceDate(occasion.occurrenceDate ?? "");
  }, [occasion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isCustom = Boolean(
    occasion && (!occasion.occasionSlug || occasion.customName || occasion.occurrenceDate)
  );

  const customerLabel = (id: string) => {
    const c = customers.find((x) => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : `${id.slice(0, 8)}…`;
  };

  const save = () => {
    if (!occasion) return;
    onSave(occasion.key, {
      leadDays,
      messageTemplate: messageTemplate.trim() || undefined,
      isEnabled,
      excludedCustomerIds,
      ...(isCustom
        ? {
            customName: customName.trim() || occasion.name,
            name: customName.trim() || occasion.name,
            occurrenceDate: occurrenceDate || occasion.occurrenceDate,
          }
        : {}),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && occasion ? (
      <div
        key="occasion-edit-dialog"
        className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <motion.button
          type="button"
          aria-label="Close dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#0B1F3D]/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#C4EBF2] bg-white shadow-2xl sm:rounded-3xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#C4EBF2] px-5 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
                Edit occasion
              </p>
              <h2
                id={titleId}
                className="mt-1 text-lg font-black text-[#0B1F3D]"
              >
                {occasion.name}
              </h2>
              <p className="mt-0.5 text-xs capitalize text-[#557393]">
                {(occasion.category ?? "custom").replace(/_/g, " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#C4EBF2] p-2 text-[#557393] hover:bg-[#F0FAFC]"
              aria-label="Close"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {isCustom ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={fieldLabelClass} htmlFor="occ-custom-name">
                    Label
                  </label>
                  <input
                    id="occ-custom-name"
                    className={textInputClass}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass} htmlFor="occ-date">
                    Date
                  </label>
                  <input
                    id="occ-date"
                    type="date"
                    className={textInputClass}
                    value={occurrenceDate}
                    onChange={(e) => setOccurrenceDate(e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm font-bold text-[#0B1F3D]">
              <input
                type="checkbox"
                className="accent-[#38B2D1]"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
              />
              Include in this campaign
            </label>

            <div>
              <label className={fieldLabelClass} htmlFor="occ-lead">
                Mailing lead days
              </label>
              <input
                id="occ-lead"
                type="number"
                min={0}
                max={60}
                className={textInputClass}
                value={leadDays}
                onChange={(e) => setLeadDays(Number(e.target.value) || 0)}
              />
              <p className="mt-1 text-xs text-[#557393]">
                Cards prepare this many days before the occasion date.
              </p>
            </div>

            <div>
              <label className={fieldLabelClass} htmlFor="occ-message">
                Custom message (optional)
              </label>
              <textarea
                id="occ-message"
                className={`${textInputClass} min-h-[88px]`}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="Leave blank to use the Messages library default"
              />
              {!messageTemplate.trim() && defaultMessagePreview?.trim() ? (
                <p className="mt-2 rounded-xl bg-[#F8FCFD] px-3 py-2 text-xs text-[#557393]">
                  <span className="font-bold text-[#0B1F3D]">Default: </span>
                  {defaultMessagePreview.trim()}
                </p>
              ) : null}
            </div>

            <div>
              <label className={fieldLabelClass} htmlFor="occ-exclude">
                Exclude customers
              </label>
              <select
                id="occ-exclude"
                className={textInputClass}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id || excludedCustomerIds.includes(id)) return;
                  setExcludedCustomerIds([...excludedCustomerIds, id]);
                }}
              >
                <option value="">Add exclusion…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
              {excludedCustomerIds.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {excludedCustomerIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
                      onClick={() =>
                        setExcludedCustomerIds(
                          excludedCustomerIds.filter((x) => x !== id)
                        )
                      }
                    >
                      {customerLabel(id)} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-[#557393]">
                  Optional — skip this occasion for specific people.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#C4EBF2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-sm font-bold text-rose-600 hover:underline"
              onClick={() => {
                onRemove(occasion.key);
                onClose();
              }}
            >
              Remove from campaign
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButtonClass}
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      ) : null}
    </AnimatePresence>
  );
}
