"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  ChartIcon,
  MailIcon,
  PlayIcon,
  UsersIcon,
} from "@/components/ui/Icons";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

type StatCardProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  value: string;
  label: string;
  delay: number;
  size?: "sm" | "md" | "lg";
};

function StatCard({
  icon: Icon,
  value,
  label,
  delay,
  size = "sm",
}: StatCardProps) {
  const sizeClasses = {
    sm: "lg:w-[190px] lg:px-5 lg:py-3",
    md: "lg:w-[220px] lg:px-5 lg:py-3",
    lg: "lg:w-[253px] lg:px-5 lg:py-3",
  };

  const iconClasses = {
    sm: "h-11 w-11",
    md: "h-11 w-11",
    lg: "h-11 w-11",
  };

  const valueClasses = {
    sm: "text-[24px]",
    md: "text-[24px]",
    lg: "text-[24px]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -4,
        scale: 1.015,
      }}
      className={`
        relative
        flex w-full items-center gap-3.5
        overflow-hidden
        rounded-2xl

        border border-white/60
        bg-white/35

        px-4 py-3

        shadow-[0_12px_40px_rgba(11,31,61,0.10)]
        backdrop-blur-xl
        backdrop-saturate-150

        transition-shadow duration-300
        hover:shadow-[0_18px_50px_rgba(56,178,209,0.18)]

        ${sizeClasses[size]}
      `}
    >
      <div
        className="
          pointer-events-none
          absolute inset-x-0 top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-white/90
          to-transparent
        "
      />

      <div
        className="
          pointer-events-none
          absolute -left-8 -top-8
          h-24 w-24
          rounded-full
          bg-[#C4EBF2]/30
          blur-2xl
        "
      />

      <div
        className={`
          relative z-10
          grid shrink-0 place-items-center
          rounded-xl

          border border-white/70
          bg-white/45

          text-[#38B2D1]

          shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_20px_rgba(56,178,209,0.12)]
          backdrop-blur-xl

          ${iconClasses[size]}
        `}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="relative z-10 min-w-0">
        <strong
          className={`
            block font-bold
            leading-none
            tracking-[-0.03em]
            text-[#0B1F3D]

            ${valueClasses[size]}
          `}
        >
          {value}
        </strong>

        <span
          className="
            mt-1.5 block
            text-[11px]
            font-semibold
            leading-tight
            text-[#486786]
          "
        >
          {label}
        </span>
      </div>
    </motion.div>
  );
}

export function Hero({ onVideo }: { onVideo: () => void }) {
  return (
    <section
      className="
        relative
        min-h-[calc(100vh-76px)]
        w-full
        overflow-hidden
        bg-white
      "
    >
      <Image
        src="/images/hero-house-hd.png"
        fill
        priority
        unoptimized
        alt="Modern luxury home with swimming pool"
        className="object-cover object-center"
        sizes="100vw"
      />

      <div
        className="
          absolute inset-0

          bg-[linear-gradient(90deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.90)_40%,rgba(255,255,255,0.52)_62%,rgba(255,255,255,0.04)_84%)]

          max-lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(255,255,255,0.92)_52%,rgba(255,255,255,0.18)_86%)]
        "
      />

      <div
        className="
          container-shell
          relative z-10
          mx-auto
          flex
          min-h-[calc(100vh-76px)]
          w-full
          max-w-[1200px]
          flex-col
          justify-center
          px-5
          py-12

          sm:px-8
          lg:px-10
        "
      >
        <div
          className="
            flex w-full flex-col

            lg:grid
            lg:grid-cols-[minmax(0,1fr)_290px]
            lg:items-center
            lg:gap-12

            xl:gap-16
          "
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="max-w-[650px]"
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                mb-5
                inline-block

                bg-gradient-to-r
                from-[#0B8DB5]
                via-[#38B2D1]
                to-[#0B8DB5]

                bg-clip-text

                font-cursive
                text-[24px]
                font-bold
                leading-[1.15]
                text-transparent

                drop-shadow-[0_2px_8px_rgba(56,178,209,0.15)]

                sm:text-[27px]
                lg:text-[29px]
              "
            >
              Stronger Relationships
              <br />
              Brighter Futures.
            </motion.div>

            <h1
              className="
                text-[clamp(3rem,5.6vw,5rem)]
                font-bold
                leading-[0.97]
                tracking-[-0.03em]
                text-[#0B1F3D]
              "
            >
              Turn Every
              <br />

              Closing Into a
              <br />

              <span className="text-[#38B2D1]">
                Client for Life.
              </span>
            </h1>

            <p
              className="
                mt-6
                max-w-[480px]
                text-[15px]
                leading-[1.75]
                text-[#3A5878]

                sm:text-[17px]
              "
            >
              Stay connected. Send meaningful touches.
              <br className="hidden sm:block" />
              Create more referrals. Automatically.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <PrimaryButton
                href="#cta"
                className="min-h-[50px] px-8 text-sm"
              >
                Get Started
              </PrimaryButton>

              <button
                type="button"
                onClick={onVideo}
                className="
                  group
                  inline-flex
                  min-h-[50px]
                  items-center
                  gap-3

                  rounded-xl
                  border border-[#C4EBF2]

                  bg-white/70
                  px-5

                  text-sm
                  font-bold
                  text-[#10284D]

                  shadow-sm
                  backdrop-blur-xl

                  transition
                  duration-300

                  hover:-translate-y-0.5
                  hover:bg-white/90
                  hover:shadow-[0_8px_24px_rgba(56,178,209,0.14)]
                "
              >
                <span
                  className="
                    grid
                    h-8 w-8
                    place-items-center

                    rounded-lg
                    bg-[#F0FAFC]/80

                    text-[#38B2D1]

                    transition-transform
                    duration-300

                    group-hover:scale-105
                  "
                >
                  <PlayIcon className="h-4 w-4 fill-current" />
                </span>

                Watch Video
              </button>
            </div>
          </motion.div>

          <div
            className="
    mt-10
    flex
    w-full
    flex-col
    items-start
    gap-3

    sm:grid
    sm:grid-cols-3

    lg:mt-0
    lg:flex
    lg:w-[290px]
    lg:flex-col
    lg:items-start
    lg:justify-center
    lg:gap-3.5
  "
          >
            <StatCard
              icon={MailIcon}
              value="2.4x"
              label="More Referrals"
              delay={0.3}
              size="sm"
            />

            <StatCard
              icon={UsersIcon}
              value="10+ hrs"
              label="Saved Every Month"
              delay={0.5}
              size="md"
            />

            <StatCard
              icon={ChartIcon}
              value="68%"
              label="Higher Repeat Business"
              delay={0.7}
              size="lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}