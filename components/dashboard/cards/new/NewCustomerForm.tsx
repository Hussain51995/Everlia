"use client";

import { SparklesIcon } from "@/components/ui/Icons";
import { NEW_CUSTOMER_FIELDS, type NewCustomerFormState } from "./types";

type NewCustomerFormProps = {
  value: NewCustomerFormState;
  onChange: (value: NewCustomerFormState) => void;
  onSave: () => void;
  onSaveAndStartCampaign?: () => void;
  isSaving: boolean;
  disabled?: boolean;
};

export function NewCustomerForm({
  value,
  onChange,
  onSave,
  onSaveAndStartCampaign,
  isSaving,
  disabled = false,
}: NewCustomerFormProps) {
  return (
    <fieldset
      disabled={disabled}
      aria-hidden={disabled}
      className="space-y-3 rounded-2xl border border-[#C4EBF2] bg-[#F8FCFD] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {NEW_CUSTOMER_FIELDS.map(([key, label]) => (
          <label
            key={key}
            className="space-y-1 text-xs font-semibold text-[#557393]"
          >
            <span>{label}</span>
            <input
              value={value[key] ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  [key]: e.target.value,
                })
              }
              className="w-full rounded-xl border border-[#C4EBF2] bg-white px-3 py-2 text-sm text-[#0B1F3D] outline-none transition focus:border-[#38B2D1]"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl border border-[#C4EBF2] bg-white px-4 py-2 text-xs font-bold text-[#0B1F3D] transition hover:bg-[#F0FAFC] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        {onSaveAndStartCampaign ? (
          <button
            type="button"
            onClick={onSaveAndStartCampaign}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#38B2D1] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#2ca0be] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Save and Start Campaign"}
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
