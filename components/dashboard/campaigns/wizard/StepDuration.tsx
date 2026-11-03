"use client";

import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import {
  fieldLabelClass,
  FormError,
  textInputClass,
} from "@/components/dashboard/campaigns/shared";

export function StepDuration({ error }: { error?: string | null }) {
  const name = useCampaignWizardStore((s) => s.name);
  const startDate = useCampaignWizardStore((s) => s.startDate);
  const endDate = useCampaignWizardStore((s) => s.endDate);
  const timezone = useCampaignWizardStore((s) => s.timezone);
  const setName = useCampaignWizardStore((s) => s.setName);
  const setStartDate = useCampaignWizardStore((s) => s.setStartDate);
  const setEndDate = useCampaignWizardStore((s) => s.setEndDate);
  const setTimezone = useCampaignWizardStore((s) => s.setTimezone);

  return (
    <div className="space-y-4">
      <FormError message={error ?? null} />
      <div>
        <label className={fieldLabelClass} htmlFor="campaign-name">
          Campaign name
        </label>
        <input
          id="campaign-name"
          className={textInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 2026 Client Care Journey"
          maxLength={160}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabelClass} htmlFor="start-date">
            Start date
          </label>
          <input
            id="start-date"
            type="date"
            className={textInputClass}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-[#557393]">
            Future start dates are supported. Occasions before start are not
            scheduled.
          </p>
        </div>
        <div>
          <label className={fieldLabelClass} htmlFor="end-date">
            End date
          </label>
          <input
            id="end-date"
            type="date"
            className={textInputClass}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-[#557393]">
            Inclusive. No new occasions schedule beyond this date.
          </p>
        </div>
      </div>
      <div>
        <label className={fieldLabelClass} htmlFor="timezone">
          Timezone
        </label>
        <select
          id="timezone"
          className={textInputClass}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          <option value="America/New_York">America/New_York</option>
          <option value="America/Chicago">America/Chicago</option>
          <option value="America/Denver">America/Denver</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="America/Phoenix">America/Phoenix</option>
        </select>
      </div>
    </div>
  );
}
