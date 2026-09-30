import {
  CalendarIcon,
  GiftIcon,
  HomeIcon,
  ClockIcon,
  ArrowIcon,
} from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

const moments = [
  {
    title: "Home Anniversary",
    sub: "Oct 12",
    desc: "Mark the day they moved in — the easiest reason in the world to reach out.",
    Icon: CalendarIcon,
    offset: "z-[1] lg:translate-x-0 lg:-rotate-[3deg]",
  },
  {
    title: "Client Birthday",
    sub: "Nov 04",
    desc: "A short note on the right day goes a surprisingly long way.",
    Icon: GiftIcon,
    offset: "z-[2] mt-4 lg:-mt-6 lg:translate-x-8 lg:-rotate-[1deg]",
  },
  {
    title: "Likely Move Window",
    sub: "2027",
    desc: "Equity unlocks and families quietly start thinking about the next home.",
    Icon: HomeIcon,
    offset: "z-[3] mt-4 lg:-mt-3 lg:translate-x-11 lg:rotate-[1.5deg]",
  },
  {
    title: "No Recent Contact",
    sub: "6+ months",
    desc: "The longer the silence runs, the harder it is to start again.",
    Icon: ClockIcon,
    offset: "z-[4] mt-4 lg:-mt-3 lg:translate-x-5 lg:rotate-[4deg]",
  },
];

export function Problem() {
  return (
    <section
      id="how-it-works"
      className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f5fcfd_52%,#c4ebf2_100%)] py-14 sm:py-16 lg:py-[80px]"
    >
      <div className="container-shell grid gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-0">
        <div className="flex items-center lg:pr-16 xl:pr-24">
          <Reveal>
            <SectionLabel>THE PROBLEM</SectionLabel>

            <h2 className="mt-4 text-[clamp(2.45rem,4.7vw,4.35rem)] font-extrabold leading-[0.99] tracking-[-0.05em] text-[#0B1F3D]">
              Clients don’t
              <br />
              forget you on purpose.
              <br />

              <span className="text-[#38B2D1]">
                Life just gets busy.
              </span>
            </h2>

            <p className="mt-6 max-w-[500px] text-sm leading-7 text-[#446688] sm:text-[15px]">
              After closing, it’s easy to lose touch. Important moments like
              home anniversaries, birthdays, and future move-up opportunities
              often pass by.
            </p>

            <a
              href="#mail-impact"
              className="group mt-8 inline-flex items-center gap-3.5 text-sm font-bold text-[#0B1F3D]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#38B2D1] shadow-sm transition-transform duration-300 group-hover:scale-105">
                <ArrowIcon className="h-4 w-4" />
              </span>

              See how it works
            </a>
          </Reveal>
        </div>

        <Reveal
          delay={0.08}
          className="flex items-center lg:pl-10 xl:pl-14"
        >
          <div className="grid w-full items-center gap-8 md:grid-cols-[0.85fr_1.15fr]">
            <div className="relative py-6 lg:pr-14 xl:pr-18">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,178,209,0.20),transparent_70%)] blur-3xl"
              />

              <div className="relative">
                {moments.map(({ title, sub, desc, Icon, offset }) => (
                  <article
                    key={title}
                    className={`
                      group
                      relative
                      flex
                      items-center
                      gap-5
                      overflow-hidden
                      rounded-3xl
                      border
                      border-white/70
                      bg-white/55
                      px-6
                      py-6
                      shadow-[0_24px_55px_-22px_rgba(32,91,117,0.50)]
                      ring-1
                      ring-inset
                      ring-white/60
                      backdrop-blur-md
                      transition-all
                      duration-300
                      ease-out
                      hover:z-40
                      hover:!rotate-0
                      hover:-translate-y-2
                      hover:bg-white/90
                      hover:shadow-[0_36px_70px_-26px_rgba(32,91,117,0.55)]
                      ${offset}
                    `}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(56,178,209,0.20),transparent_70%)]"
                    />

                    <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(150deg,#ffffff_0%,#e3f6fa_100%)] text-[#38B2D1] shadow-[0_12px_24px_-12px_rgba(56,178,209,0.9),inset_0_1px_0_rgba(255,255,255,0.9)]">
                      <Icon className="h-6 w-6" />
                    </span>

                    <div className="relative min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <strong className="min-w-0 truncate text-[15px] font-bold tracking-[-0.01em] text-[#0B1F3D]">
                          {title}
                        </strong>

                        <span className="shrink-0 rounded-full bg-[#EAF6F9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#38B2D1]">
                          {sub}
                        </span>
                      </div>

                      <p className="mt-2 text-[12.5px] leading-[1.5] text-[#5b7a9c]">
                        {desc}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="relative lg:-translate-y-4">
              <div className="flex min-h-[150px] w-full flex-col justify-between rounded-2xl border border-white/80 bg-white p-4 shadow-[0_2px_8px_rgba(67,109,117,0.14),0_10px_30px_rgba(67,109,117,0.20),0_20px_45px_-10px_rgba(67,109,117,0.28)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(67,109,117,0.20),0_16px_40px_rgba(67,109,117,0.32)]">
                <div>
                  <SectionLabel>A BETTER WAY</SectionLabel>

                  <h3 className="mt-3 text-lg font-bold leading-tight tracking-[-0.03em] text-[#0B1F3D]">
                    Good relationships deserve better than a spreadsheet.
                  </h3>
                </div>

                <a
                  href="#mail-impact"
                  className="mt-5 grid h-11 w-11 place-items-center rounded-xl bg-[#F0FAFC] text-[#38B2D1] shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[#E2F6FA]"
                  aria-label="Continue"
                >
                  <ArrowIcon className="h-4 w-4" />
                </a>
              </div>
            </aside>
          </div>
        </Reveal>
      </div>
    </section>
  );
}