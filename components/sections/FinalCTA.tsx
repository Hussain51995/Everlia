import Image from "next/image";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function FinalCTA() {
  return (
    <section id="cta" className="py-8 sm:py-12">
      <div className="container-shell relative min-h-[420px] overflow-hidden rounded-[24px] bg-[#F0FAFC] shadow-[0_2px_8px_rgba(67,109,117,0.14),0_4px_25px_rgba(67,109,117,0.20),0_24px_50px_-10px_rgba(67,109,117,0.30)] transition-shadow duration-300 hover:shadow-[0_4px_12px_rgba(67,109,117,0.18),0_8px_35px_rgba(67,109,117,0.26),0_30px_65px_-10px_rgba(67,109,117,0.38)]">
        <Image
          src="/images/cta-interior-sharp.png"
          fill
          unoptimized
          alt="Luxury interior overlooking city at sunset"
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 1200px"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_38%,rgba(255,255,255,0.55)_58%,rgba(255,255,255,0.05)_82%)] max-lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_50%,rgba(255,255,255,0.2)_85%)]" />

        <Reveal className="relative z-10 flex min-h-[420px] max-w-[660px] flex-col justify-center px-7 py-12 sm:px-12 lg:px-14">
          <SectionLabel>
            YOUR CLIENTS REMEMBER<br />
            HOW YOU MAKE THEM FEEL
          </SectionLabel>

          <h2 className="mt-4 text-[clamp(2.85rem,5vw,4.55rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-[#0B1F3D]">
            Let’s build<br />
            longer relationships.
          </h2>

          <p className="mt-5 text-sm font-semibold text-[#446688] sm:text-[16px]">
            Start your client-for-life system today.
          </p>

          <div id="pricing" className="mt-8 flex flex-wrap items-center gap-3.5">
            <PrimaryButton href="/sign-up" className="min-h-[50px] px-8 text-sm">
              Get Started
            </PrimaryButton>

            <a
              href="#pricing"
              className="inline-flex min-h-[50px] items-center justify-center rounded-xl border border-[#C4EBF2] bg-white px-7 text-sm font-bold text-[#0B1F3D] shadow-[0_8px_20px_rgba(56,178,209,0.08)] transition-all hover:bg-[#F0FAFC]"
            >
              View Pricing
            </a>
          </div>
        </Reveal>

        <p className="absolute right-[8%] top-[38%] z-10 hidden max-w-[240px] text-[18px] font-bold leading-[1.3] tracking-[-0.025em] text-[#0B1F3D] lg:block">
          Clients for today.<br />
          Opportunities for tomorrow.
        </p>
      </div>
    </section>
  );
}
