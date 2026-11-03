"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon, SparklesIcon } from "@/components/ui/Icons";
import { ThemeLoader } from "@/components/ui/ThemeLoader";
import { useCampaignEligibleTemplates } from "@/hooks/campaigns";
import { useCampaignWizardStore } from "@/stores/campaign-wizard-store";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/dashboard/campaigns/shared";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function StartCampaignDialog({ open, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const { data: templates, isLoading } = useCampaignEligibleTemplates();
  const setTemplateId = useCampaignWizardStore((s) => s.setTemplateId);
  const setStep = useCampaignWizardStore((s) => s.setStep);
  const reset = useCampaignWizardStore((s) => s.reset);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const continueWizard = () => {
    if (!selected) return;
    reset();
    setTemplateId(selected);
    setStep(2);
    onClose();
    router.push(`/dashboard/campaigns/new?templateId=${selected}`);
  };

  return (
    <AnimatePresence>
      {open ? (
        <div
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
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#C4EBF2] bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#C4EBF2] px-5 py-4 sm:px-6">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#38B2D1]">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Start Campaign
                </p>
                <h2
                  id={titleId}
                  className="mt-1 text-xl font-black text-[#0B1F3D]"
                >
                  Choose a master design
                </h2>
                <p className="mt-1 text-sm text-[#557393]">
                  Only reusable designs with dynamic personalization regions are
                  shown.
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

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {isLoading ? (
                <div className="grid min-h-[200px] place-items-center">
                  <ThemeLoader label="Loading designs…" />
                </div>
              ) : !templates?.length ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No campaign-eligible master designs are available yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {templates.map((template) => {
                    const thumb =
                      template.preview_image_url ||
                      template.front_background_url;
                    const isSelected = selected === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelected(template.id)}
                        className={`overflow-hidden rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "border-[#38B2D1] ring-4 ring-[#38B2D1]/20"
                            : "border-[#C4EBF2] hover:border-[#38B2D1]/60"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt=""
                          className="aspect-[5/3] w-full object-cover bg-[#F0FAFC]"
                        />
                        <div className="p-3">
                          <p className="text-sm font-bold text-[#0B1F3D]">
                            {template.name}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-[#557393]">
                            {template.category.replace(/_/g, " ")}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-[#C4EBF2] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
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
                disabled={!selected}
                onClick={continueWizard}
              >
                Continue to wizard
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
