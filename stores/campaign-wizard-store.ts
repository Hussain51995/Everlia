"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export type WizardOccasionDraft = {
  key: string;
  occasionId?: string;
  occasionSlug?: string;
  name: string;
  category?: string;
  customName?: string;
  occurrenceDate?: string;
  leadDays: number;
  messageTemplate?: string;
  isEnabled: boolean;
  excludedCustomerIds: string[];
};

export type CampaignWizardState = {
  step: WizardStep;
  templateId: string | null;
  customerIds: string[];
  selectAllEligible: boolean;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  occasions: WizardOccasionDraft[];
  optedOutOccasionSlugs: string[];
  includeCompanyLogo: boolean;
  draftCampaignId: string | null;
  setStep: (step: WizardStep) => void;
  setTemplateId: (id: string | null) => void;
  setIncludeCompanyLogo: (value: boolean) => void;
  setCustomerIds: (ids: string[]) => void;
  toggleCustomer: (id: string) => void;
  setSelectAllEligible: (value: boolean) => void;
  setName: (name: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setTimezone: (tz: string) => void;
  setOccasions: (occasions: WizardOccasionDraft[]) => void;
  updateOccasion: (key: string, patch: Partial<WizardOccasionDraft>) => void;
  removeOccasion: (key: string) => void;
  addOccasion: (occasion: WizardOccasionDraft) => void;
  optOutOccasionSlug: (slug: string) => void;
  clearOptedOutOccasionSlug: (slug: string) => void;
  setDraftCampaignId: (id: string | null) => void;
  reset: () => void;
};

const initialDates = () => {
  const now = new Date();
  const start = now.toISOString().slice(0, 10);
  const end = new Date(now);
  end.setFullYear(end.getFullYear() + 1);
  return { startDate: start, endDate: end.toISOString().slice(0, 10) };
};

const defaults = () => {
  const dates = initialDates();
  return {
    step: 1 as WizardStep,
    templateId: null as string | null,
    customerIds: [] as string[],
    selectAllEligible: false,
    name: "",
    startDate: dates.startDate,
    endDate: dates.endDate,
    timezone: "America/New_York",
    occasions: [] as WizardOccasionDraft[],
    optedOutOccasionSlugs: [] as string[],
    includeCompanyLogo: false,
    draftCampaignId: null as string | null,
  };
};

export const useCampaignWizardStore = create<CampaignWizardState>()(
  persist(
    (set, get) => ({
      ...defaults(),
      setStep: (step) => set({ step }),
      setTemplateId: (templateId) => set({ templateId }),
      setIncludeCompanyLogo: (includeCompanyLogo) => set({ includeCompanyLogo }),
      setCustomerIds: (customerIds) => set({ customerIds, selectAllEligible: false }),
      toggleCustomer: (id) => {
        const current = get().customerIds;
        set({
          customerIds: current.includes(id)
            ? current.filter((c) => c !== id)
            : [...current, id],
          selectAllEligible: false,
        });
      },
      setSelectAllEligible: (selectAllEligible) => set({ selectAllEligible }),
      setName: (name) => set({ name }),
      setStartDate: (startDate) => set({ startDate }),
      setEndDate: (endDate) => set({ endDate }),
      setTimezone: (timezone) => set({ timezone }),
      setOccasions: (occasions) => set({ occasions }),
      updateOccasion: (key, patch) =>
        set({
          occasions: get().occasions.map((o) =>
            o.key === key ? { ...o, ...patch } : o
          ),
        }),
      removeOccasion: (key) =>
        set({ occasions: get().occasions.filter((o) => o.key !== key) }),
      addOccasion: (occasion) =>
        set({ occasions: [...get().occasions, occasion] }),
      optOutOccasionSlug: (slug) => {
        const current = get().optedOutOccasionSlugs;
        if (current.includes(slug)) return;
        set({ optedOutOccasionSlugs: [...current, slug] });
      },
      clearOptedOutOccasionSlug: (slug) =>
        set({
          optedOutOccasionSlugs: get().optedOutOccasionSlugs.filter(
            (s) => s !== slug
          ),
        }),
      setDraftCampaignId: (draftCampaignId) => set({ draftCampaignId }),
      reset: () => set(defaults()),
    }),
    {
      name: "everlia-campaign-wizard-draft",
      partialize: (state) => ({
        step: state.step,
        templateId: state.templateId,
        customerIds: state.customerIds,
        selectAllEligible: state.selectAllEligible,
        name: state.name,
        startDate: state.startDate,
        endDate: state.endDate,
        timezone: state.timezone,
        occasions: state.occasions,
        optedOutOccasionSlugs: state.optedOutOccasionSlugs,
        includeCompanyLogo: state.includeCompanyLogo,
        draftCampaignId: state.draftCampaignId,
      }),
    }
  )
);
