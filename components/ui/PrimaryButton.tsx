import { ArrowIcon } from "./Icons";
type Props = { href: string; children: React.ReactNode; className?: string; showArrow?: boolean };

export function PrimaryButton({ href, children, className = "", showArrow = true }: Props) {
  return (
    <a
      href={href}
      className={`group inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#38B2D1_0%,#2ca0be_50%,#436D75_100%)] px-6 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(56,178,209,0.32)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(56,178,209,0.42)] active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38B2D1] focus-visible:ring-offset-2 ${className}`}
    >
      <span>{children}</span>
      {showArrow && <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
    </a>
  );
}

