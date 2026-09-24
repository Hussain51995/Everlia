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
    sub: "OCT 12",
    Icon: CalendarIcon,
    position: "lg:translate-x-0 lg:-rotate-[2deg]",
  },
  {
    title: "Client Birthday",
    sub: "NOV 04",
    Icon: GiftIcon,
    position: "lg:translate-x-8 lg:rotate-[1.5deg]",
  },
  {
    title: "Likely Move Window",
    sub: "2027",
    Icon: HomeIcon,
    position: "lg:translate-x-16 lg:-rotate-[1.5deg]",
  },
  {
    title: "No Recent Contact",
    sub: "6+ months",
    Icon: ClockIcon,
    position: "lg:translate-x-24 lg:rotate-[2deg]",
  },
];

export function Problem() {
  return (
    <section
      id="how-it-works"
      className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f5fcfd_52%,#c4ebf2_100%)] py-14 sm:py-16 lg:py-[80px]"
    >
      <div
        aria-hidden="true"
        className="absolute bottom-[10%] left-1/2 top-[10%] hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#8BCEDC]/50 to-transparent lg:block"
      />

      <div className="container-shell grid gap-14 lg:grid-cols-2 lg:gap-0">
        <div className="flex items-center lg:pr-14 xl:pr-20">
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
          className="flex items-center lg:pl-14 xl:pl-20"
        >
          <div className="grid w-full items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="relative py-6 lg:pr-20">
              <div className="space-y-4">
                {moments.map(({ title, sub, Icon, position }) => (
                  <article
                    key={title}
                    className={`
                      group
                      relative
                      flex
                      items-center
                      gap-3.5
                      rounded-2xl
                      border
                      border-white/80
                      bg-white
                      px-5
                      py-4
                      shadow-[0_14px_35px_rgba(32,91,117,0.08)]
                      transition-all
                      duration-300
                      ease-out
                      hover:z-10
                      hover:!rotate-0
                      hover:-translate-y-1
                      hover:shadow-[0_20px_45px_rgba(32,91,117,0.13)]
                      ${position}
                    `}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#f5fcfd,#c4ebf2,#aad5de)] text-[#38B2D1]">
                      <Icon className="h-5 w-5" />
                    </span>

                    <div>
                      <strong className="block text-[14px] font-bold text-[#0B1F3D]">
                        {title}
                      </strong>

                      <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6380a0]">
                        {sub}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="relative lg:-translate-y-4">
              <div className="flex min-h-[245px] flex-col justify-between rounded-2xl border border-white/80 bg-white p-7 shadow-[0_18px_45px_rgba(32,91,117,0.09)]">
                <div>
                  <SectionLabel>A BETTER WAY</SectionLabel>

                  <h3 className="mt-4 text-xl font-bold leading-tight tracking-[-0.03em] text-[#0B1F3D]">
                    Good relationships deserve better than a spreadsheet.
                  </h3>
                </div>

                <a
                  href="#mail-impact"
                  className="mt-7 grid h-11 w-11 place-items-center rounded-xl bg-[#F0FAFC] text-[#38B2D1] shadow-sm transition-all duration-300 hover:scale-105 hover:bg-[#E2F6FA]"
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