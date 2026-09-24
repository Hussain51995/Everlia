export function Logo() {
  return (
    <a href="#top" className="inline-flex items-center gap-2.5 group select-none" aria-label="HomeLink home">
      <span className="grid h-9 w-9 place-items-center text-[#38B2D1] sm:h-10 sm:w-10 transition-transform group-hover:scale-105">
        <svg viewBox="0 0 32 32" className="h-full w-full fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14.5L16 4.5L28 14.5V26.5C28 27.0523 27.5523 27.5 27 27.5H5C4.44772 27.5 4 27.0523 4 26.5V14.5Z" />
          <circle cx="16" cy="18" r="3.5" strokeWidth="2" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-extrabold tracking-[-0.03em] text-[#557393]">HomeLink™</span>
        <span className="block text-[8px] font-bold tracking-[0.14em] text-[#557393] uppercase">CLIENTS FOR LIFE</span>
      </span>
    </a>
  );
}

