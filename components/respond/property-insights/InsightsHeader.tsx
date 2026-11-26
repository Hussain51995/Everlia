"use client";

type Props = {
  displayHint?: string | null;
  customerFirstName?: string;
};

export function InsightsHeader({ displayHint, customerFirstName }: Props) {
  return (
    <header className="min-w-0 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#38B2D1]">
        Home insights
      </p>
      <h2 className="break-words [overflow-wrap:anywhere] text-[1.25rem] font-extrabold tracking-tight text-[#0B1F3D] min-[380px]:text-[1.35rem] sm:text-2xl lg:text-[1.75rem]">
        {customerFirstName
          ? `${customerFirstName}, here’s a look at your home`
          : "A look at your home"}
      </h2>
      {displayHint ? (
        <p className="break-words [overflow-wrap:anywhere] text-sm text-[#6B849E]">
          Based on{" "}
          <span className="font-semibold text-[#0B1F3D]">{displayHint}</span>
        </p>
      ) : (
        <p className="text-sm text-[#6B849E]">
          Personalized property insights prepared for you — estimates and market
          snapshots, not a formal appraisal.
        </p>
      )}
    </header>
  );
}
