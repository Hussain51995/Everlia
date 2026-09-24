"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CloseIcon, SparklesIcon, SendIcon, CheckCircleIcon, GiftIcon, HomeIcon, ChartIcon } from "@/components/ui/Icons";

interface QuickCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  {
    id: "anniversary",
    title: "Home Anniversary Card",
    desc: "Personalized premium card sent on home purchase date.",
    icon: HomeIcon,
    badge: "Highest Response",
  },
  {
    id: "sold",
    title: "Just Sold / Listed Postcard",
    desc: "Targeted neighborhood radius postcard with recent sale price.",
    icon: SendIcon,
    badge: "Popular",
  },
  {
    id: "valuation",
    title: "Quarterly Market Report",
    desc: "Custom equity report with personalized QR valuation link.",
    icon: ChartIcon,
    badge: null,
  },
  {
    id: "gift",
    title: "Coffee / Gift Voucher Note",
    desc: "High-value handwritten note with digital Starbucks/Amazon card.",
    icon: GiftIcon,
    badge: "Luxury Touch",
  },
];

export function QuickCampaignModal({ open, onClose }: QuickCampaignModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("anniversary");
  const [recipientsCount, setRecipientsCount] = useState(250);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const pricePerUnit = 1.45;
  const totalCost = (recipientsCount * pricePerUnit).toFixed(2);

  const handleLaunch = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 800);
  };

  const handleResetAndClose = () => {
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="absolute inset-0 bg-[#0B1F3D]/70 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative z-10 w-full max-w-xl rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-2xl sm:p-8"
        >
          <button
            onClick={handleResetAndClose}
            className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-xl bg-[#F0FAFC] text-[#0B1F3D] hover:bg-[#38B2D1] hover:text-white transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>

          {success ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircleIcon className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-black text-[#0B1F3D]">Campaign Queued for Dispatch!</h3>
              <p className="max-w-md mx-auto text-xs text-[#557393] leading-relaxed">
                Your <span className="font-bold text-[#0B1F3D]">{recipientsCount} mailers</span> have been sent to our printing & address verification line. USPS tracking will update in your dashboard shortly.
              </p>
              <button
                onClick={handleResetAndClose}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#38B2D1] px-8 py-3 text-xs font-bold text-white shadow-lg hover:bg-[#2ca0be]"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-[#F0FAFC] px-3 py-1 text-[11px] font-bold text-[#38B2D1] uppercase tracking-wider">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Instant Direct Mail Launcher
                </span>
                <h3 className="mt-3 text-2xl font-extrabold text-[#0B1F3D]">
                  Launch Direct Mail Campaign
                </h3>
                <p className="mt-1 text-xs text-[#557393]">
                  Select a proven card design, pick recipient count, and schedule automated delivery.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
                  1. Select Mail Template
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${isSelected
                          ? "border-[#38B2D1] bg-[#38B2D1]/10 ring-2 ring-[#38B2D1]/20"
                          : "border-[#C4EBF2] bg-[#F0FAFC] hover:border-[#38B2D1]/50"
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`grid h-8 w-8 place-items-center rounded-xl ${isSelected ? "bg-[#38B2D1] text-white" : "bg-white text-[#38B2D1]"}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {tmpl.badge && (
                            <span className="rounded-full bg-[#38B2D1]/20 px-2 py-0.5 text-[9px] font-bold text-[#38B2D1]">
                              {tmpl.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className="text-xs font-extrabold text-[#0B1F3D]">{tmpl.title}</div>
                          <div className="mt-0.5 text-[10px] text-[#557393] leading-snug">{tmpl.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#0B1F3D]">
                    2. Select Recipient Audience
                  </label>
                  <span className="text-xs font-black text-[#38B2D1]">
                    {recipientsCount} Contacts
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2500}
                  step={50}
                  value={recipientsCount}
                  onChange={(e) => setRecipientsCount(Number(e.target.value))}
                  className="w-full accent-[#38B2D1]"
                />
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#557393]">
                    Estimated Print + Mail Cost
                  </div>
                  <div className="text-xl font-black text-[#0B1F3D]">
                    ${totalCost}{" "}
                    <span className="text-xs font-normal text-[#557393]">
                      (${pricePerUnit}/mailer incl. USPS postage)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#38B2D1] px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-[#2ca0be] disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Dispatch Now</span>
                      <SendIcon className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
