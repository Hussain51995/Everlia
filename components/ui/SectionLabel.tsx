export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase leading-[1.25] tracking-[0.13em] text-[#38B2D1] sm:text-[11px]">
      {children}
    </p>
  );
}
