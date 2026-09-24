import { Logo } from "@/components/ui/Logo";
import { LinkedInIcon, InstagramIcon, YouTubeIcon } from "@/components/ui/Icons";

export function Footer() {
  return (
    <footer className="border-t border-[#C4EBF2] bg-white py-8">
      <div className="container-shell">
        <div className="grid items-center gap-6 pb-6 text-center lg:grid-cols-[1fr_auto_1fr] lg:text-left">
          <div className="justify-self-center lg:justify-self-start">
            <Logo />
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs font-semibold text-[#446688]">
            <a href="#top" className="transition-colors hover:text-[#38B2D1]">Home</a>
            <a href="#features" className="transition-colors hover:text-[#38B2D1]">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-[#38B2D1]">How It Works</a>
            <a href="#teams" className="transition-colors hover:text-[#38B2D1]">For Teams</a>
            <a href="#pricing" className="transition-colors hover:text-[#38B2D1]">Pricing</a>
          </nav>

          <div className="flex justify-center gap-2.5 lg:justify-end">
            <a
              href="#"
              aria-label="LinkedIn"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#C4EBF2] bg-white text-[#0B1F3D] shadow-sm transition-transform hover:scale-105 hover:text-[#38B2D1]"
            >
              <LinkedInIcon className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#C4EBF2] bg-white text-[#0B1F3D] shadow-sm transition-transform hover:scale-105 hover:text-[#38B2D1]"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="YouTube"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#C4EBF2] bg-white text-[#0B1F3D] shadow-sm transition-transform hover:scale-105 hover:text-[#38B2D1]"
            >
              <YouTubeIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#C4EBF2] pt-6 text-[11px] font-medium text-[#6380a0] sm:flex-row">
          <span>© 2026 HomeLink, Inc. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-[#0B1F3D]">Privacy</a>
            <a href="#" className="transition-colors hover:text-[#0B1F3D]">Terms</a>
            <a href="#" className="transition-colors hover:text-[#0B1F3D]">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
