import Image from "next/image";
import { CheckIcon } from "@/components/ui/Icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

const bullets = [
  "Premium, branded designs",
  "Printed & mailed automatically",
  "Unique QR codes for engagement",
  "Fully compliant and secure",
];

function QRMark() {
  const cells = [
    [2, 2],
    [3, 2],
    [4, 2],
    [8, 2],
    [10, 2],
    [11, 2],
    [12, 2],
    [13, 2],
    [2, 3],
    [4, 3],
    [7, 3],
    [9, 3],
    [13, 3],
    [2, 4],
    [4, 4],
    [6, 4],
    [8, 4],
    [10, 4],
    [13, 4],
    [2, 6],
    [3, 6],
    [4, 6],
    [6, 6],
    [7, 6],
    [9, 6],
    [11, 6],
    [12, 6],
    [13, 6],
    [3, 7],
    [6, 7],
    [8, 7],
    [10, 7],
    [12, 7],
    [2, 8],
    [4, 8],
    [5, 8],
    [7, 8],
    [8, 8],
    [11, 8],
    [13, 8],
    [2, 10],
    [3, 10],
    [4, 10],
    [6, 10],
    [9, 10],
    [10, 10],
    [12, 10],
    [13, 10],
    [2, 11],
    [4, 11],
    [7, 11],
    [9, 11],
    [11, 11],
    [13, 11],
    [2, 12],
    [4, 12],
    [6, 12],
    [8, 12],
    [10, 12],
    [13, 12],
    [2, 13],
    [3, 13],
    [4, 13],
    [7, 13],
    [8, 13],
    [11, 13],
    [12, 13],
    [13, 13],
  ];

  return (
    <svg
      viewBox="0 0 16 16"
      className="h-12 w-12 shrink-0"
      aria-hidden="true"
    >
      <rect width="16" height="16" rx="1.5" fill="#fff" />

      {cells.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="1"
          height="1"
          fill="#0B1F3D"
        />
      ))}

      <rect
        x="1"
        y="1"
        width="4"
        height="4"
        fill="none"
        stroke="#0B1F3D"
        strokeWidth="1"
      />

      <rect
        x="11"
        y="1"
        width="4"
        height="4"
        fill="none"
        stroke="#0B1F3D"
        strokeWidth="1"
      />

      <rect
        x="1"
        y="11"
        width="4"
        height="4"
        fill="none"
        stroke="#0B1F3D"
        strokeWidth="1"
      />
    </svg>
  );
}

function MailVisual() {
  return (
    <div
      className="
        relative
        h-full
        min-h-[440px]
        w-full
        overflow-hidden
        bg-[linear-gradient(145deg,#f5fcfd_0%,#c4ebf2_50%,#aad5de_100%)]
        p-6
        sm:min-h-[520px]
      "
    >
      <div className="absolute left-[8%] top-[12%] h-[64%] w-[72%] -rotate-[6deg] rounded-[16px] bg-[#17395F] shadow-[0_24px_48px_rgba(22,54,90,0.22)]" />

      <div className="absolute right-[8%] top-[24%] z-[8] h-[44%] w-[44%] rotate-[6deg] overflow-hidden rounded-[12px] border-2 border-white bg-white shadow-[0_20px_42px_rgba(35,79,124,0.18)]">
        <Image
          src="/images/hero-house-hd.png"
          alt="Modern home postcard"
          fill
          unoptimized
          className="object-cover"
          sizes="300px"
        />
      </div>

      <div className="absolute left-[14%] top-[16%] z-10 w-[60%] -rotate-[4deg] rounded-[16px] bg-[#FFFEFB] px-6 py-8 shadow-[0_24px_52px_rgba(34,80,126,0.18)] sm:px-8 sm:py-10">
        <div className="mx-auto mb-5 grid h-9 w-9 place-items-center text-[#38B2D1]">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 fill-none stroke-current"
            strokeWidth="1.6"
          >
            <path d="M4 11 12 4l8 7v9H4v-9Z" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </div>

        <h3 className="text-center font-serif text-[clamp(1.6rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.03em] text-[#0B1F3D]">
          Happy
          <br />
          Home Anniversary
        </h3>

        <p className="mt-4 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-[#6380a0]">
          Here&apos;s to another year
          <br />
          in your beautiful home.
        </p>

        <div className="mx-auto mt-6 h-px w-16 bg-[#b8cee2]" />
      </div>

      <div className="absolute bottom-[6%] left-[6%] z-20 flex items-center gap-3.5 rounded-[18px] border border-[#C4EBF2] bg-white px-4 py-3 shadow-[0_18px_40px_rgba(56,178,209,0.16)] sm:px-5 sm:py-3.5">
        <QRMark />

        <div>
          <strong className="block text-sm font-bold text-[#0B1F3D]">
            Scan. Connect. Closer.
          </strong>

          <span className="mt-0.5 block text-[11px] leading-snug text-[#557393]">
            Home value, quick questions
            <br className="hidden sm:block" />
            or just say hello.
          </span>
        </div>
      </div>
    </div>
  );
}

export function MailImpact() {
  return (
    <section id="mail-impact" className="py-8 sm:py-12">
      <div className="container-shell rounded-[26px] bg-gradient-to-r from-[#C4EBF2] via-[#43c5e6] to-[#C4EBF2] p-[2px] shadow-2xl shadow-[#38B2D1]/20">
        <div
          className="
            grid
            items-stretch
            overflow-hidden
            rounded-[24px]
            bg-white
            lg:grid-cols-[1.02fr_0.98fr]
          "
        >
          <Reveal className="relative h-full">
            <div className="h-full">
              <MailVisual />
            </div>
          </Reveal>

          <Reveal
            delay={0.08}
            className="
              flex
              h-full
              flex-col
              justify-center
              bg-[linear-gradient(145deg,#ffffff_0%,#f5fcfd_58%,#f0fafc_100%)]
              px-7
              py-10
              sm:px-10
              lg:px-14
            "
          >
            <SectionLabel>MORE THAN A CRM</SectionLabel>

            <h2 className="mt-4 text-[clamp(2.7rem,4.5vw,4.45rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-[#0B1F3D]">
              Real mail.
              <br />
              Real impact.
            </h2>

            <p className="mt-6 max-w-[500px] text-sm leading-7 text-[#446688] sm:text-[15px]">
              Beautifully designed, personalized postcards and cards — printed,
              addressed and delivered for you. Combined with email and optional
              SMS, you stay top of mind without the extra work.
            </p>

            <ul className="mt-6 space-y-3">
              {bullets.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-semibold text-[#0B1F3D]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#38B2D1] text-white shadow-sm">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>

                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <PrimaryButton href="#features" className="px-7 text-xs">
                Explore Features
              </PrimaryButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}