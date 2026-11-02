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
      <ol className="flex w-full items-start">
        {STEPS.map((item, index) => {
          const done = current > item.step;
          const active = current === item.step;
          const leftComplete = current >= item.step;
          const rightComplete = current > item.step;

          return (
            <li key={item.step} className="relative flex min-w-0 flex-1 flex-col items-center">
              <div className="relative flex h-7 w-full items-center justify-center">
                {index > 0 ? (
                  <span
                    className={[
                      "absolute top-1/2 right-1/2 left-0 h-0.5 -translate-y-1/2",
                      leftComplete ? "bg-[#38B2D1]" : "bg-[#C4EBF2]",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
                {index < STEPS.length - 1 ? (
                  <span
                    className={[
                      "absolute top-1/2 left-1/2 right-0 h-0.5 -translate-y-1/2",
                      rightComplete ? "bg-[#38B2D1]" : "bg-[#C4EBF2]",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
                <span
                  className={[
                    "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                    done || active
                      ? "bg-[#38B2D1] text-white"
                      : "bg-[#E8F4F7] text-[#557393]",
                  ].join(" ")}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : item.step}
                </span>
              </div>
              <span
                className={[
                  "mt-1.5 max-w-full truncate px-0.5 text-center text-[10px] font-semibold uppercase tracking-wide",
                  active ? "text-[#0B1F3D]" : "text-[#557393]",
                  "hidden sm:block",
                ].join(" ")}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
