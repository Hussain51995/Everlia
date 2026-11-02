"use client";

import type { SignupWizardStep } from "@/stores/auth-store";

const STEPS: { step: SignupWizardStep; label: string }[] = [
  { step: 1, label: "Industry" },
  { step: 2, label: "Email" },
  { step: 3, label: "Organization" },
  { step: 4, label: "Account" },
];

export function SignupProgress({ current }: { current: SignupWizardStep }) {
  return (
    <nav aria-label="Signup progress" className="mb-6">
      <ol className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((item, index) => {
          const done = current > item.step;
          const active = current === item.step;
          return (
            <li key={item.step} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span
                  className={[
                    "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-colors",
                    done || active
                      ? "bg-[#38B2D1] text-white"
                      : "bg-[#E8F4F7] text-[#557393]",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : item.step}
                </span>
                <span
                  className={[
                    "hidden truncate text-[10px] font-semibold uppercase tracking-wide sm:block",
                    active ? "text-[#0B1F3D]" : "text-[#557393]",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={[
                    "mb-0 h-0.5 w-full max-w-[28px] rounded-full sm:mb-4 sm:max-w-none",
                    current > item.step ? "bg-[#38B2D1]" : "bg-[#C4EBF2]",
                  ].join(" ")}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
