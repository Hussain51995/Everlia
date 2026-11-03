"use client";

import { InfoBanner } from "@/components/dashboard/campaigns/shared";

export function FreeTestingBanner({
  estimatedCardCount,
  enrolledCustomerCount,
}: {
  estimatedCardCount?: number;
  enrolledCustomerCount?: number;
}) {
  return (
    <div className="space-y-2">
      <InfoBanner tone="success">
        <p className="font-bold text-emerald-900">
          Free Testing Mode — No platform charges
        </p>
        <p className="mt-1 text-emerald-800">
          Everlia campaigns are free during testing. No payment provider is
          required and this application will not charge you.
        </p>
      </InfoBanner>
      <InfoBanner tone="warning">
        Physical postcards are <strong>not</strong> sent in test mode. Artwork
        and sandbox mailing records may be created, but live postage and real
        USPS delivery are disabled unless separately approved and configured.
      </InfoBanner>
      {estimatedCardCount != null || enrolledCustomerCount != null ? (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#C4EBF2] bg-[#F0FAFC] p-3 text-xs sm:grid-cols-4">
          {enrolledCustomerCount != null ? (
            <div>
              <p className="font-bold uppercase tracking-wider text-[#557393]">
                Customers
              </p>
              <p className="text-lg font-black text-[#0B1F3D]">
                {enrolledCustomerCount}
              </p>
            </div>
          ) : null}
          {estimatedCardCount != null ? (
            <div>
              <p className="font-bold uppercase tracking-wider text-[#557393]">
                Est. cards
              </p>
              <p className="text-lg font-black text-[#0B1F3D]">
                {estimatedCardCount}
              </p>
            </div>
          ) : null}
          <div>
            <p className="font-bold uppercase tracking-wider text-[#557393]">
              Est. cost
            </p>
            <p className="text-lg font-black text-[#0B1F3D]">$0.00</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-wider text-[#557393]">
              Billing
            </p>
            <p className="text-sm font-bold text-[#0B1F3D]">Waived</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
