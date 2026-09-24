import { CalendarIcon, ChartIcon, MailIcon, SendIcon, UsersIcon, ArrowIcon } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

const items = [
  {
    title: <>Automated<br />Client Journeys</>,
    copy: "Keep in touch for years to come.",
    Icon: SendIcon
  },
  {
    title: <>Personalised<br />Cards & Email</>,
    copy: "Branded, meaningful and timely.",
    Icon: MailIcon
  },
  {
    title: <>Important<br />Milestone Alerts</>,
    copy: "Birthdays, home anniversaries and more.",
    Icon: CalendarIcon
  },
  {
    title: <>Engagement<br />Tracking</>,
    copy: "Know when to follow up.",
    Icon: ChartIcon
  },
  {
    title: <>Built for<br />Realtors</>,
    copy: "Made by agents, for agents.",
    Icon: UsersIcon
  }
];

export function Features() {
  return (
    <section id="features" className="w-full bg-[linear-gradient(135deg,#ffffff_0%,#f5fcfd_48%,#c4ebf2_100%)] py-12 sm:py-16">
      <div className="container-shell">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionLabel>
            BUILT FOR WHAT<br />MATTERS MOST
          </SectionLabel>
          <a
            href="#how-it-works"
            className="group flex items-center gap-2 text-xs font-bold text-[#38B2D1] transition-colors hover:text-[#436D75]"
          >
            See All Features{" "}
            <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {items.map(({ title, copy, Icon }, i) => (
            <Reveal key={i} delay={i * 0.04}>
              <article className="flex min-h-[190px] h-full flex-col items-center justify-center rounded-xl bg-white px-4 py-6 text-center shadow-sm transition-transform hover:-translate-y-1">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(145deg,#f5fcfd_0%,#c4ebf2_45%,#aad5de_75%,#38b2d1_100%)] text-[#38B2D1] shadow-sm">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-[13px] font-bold leading-snug tracking-[-0.01em] text-[#0B1F3D]">
                  {title}
                </h3>
                <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-[#6380a0]">
                  {copy}
                </p>
              </article>
            </Reveal>
          ))}

          <Reveal delay={0.25}>
            <article className="flex min-h-[190px] h-full flex-col justify-between rounded-xl bg-[linear-gradient(145deg,#ffffff_0%,#f5fcfd_50%,#c4ebf2_100%)] px-5 py-6 shadow-sm transition-transform hover:-translate-y-1">
              <h3 className="text-[clamp(1.4rem,1.8vw,1.85rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[#38B2D1]">
                More<br />
                Relationships.<br />
                A Stronger<br />
                Business.
              </h3>
              <a
                href="#cta"
                className="mt-4 grid h-10 w-10 place-items-center rounded-xl bg-white text-[#38B2D1] shadow-sm transition-transform hover:scale-105"
                aria-label="Get started"
              >
                <ArrowIcon className="h-4 w-4" />
              </a>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
