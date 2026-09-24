"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ArrowIcon } from "@/components/ui/Icons";
import { SectionLabel } from "@/components/ui/SectionLabel";

const testimonials = [
  {
    quote: "I've received more referrals this year than ever before. The postcards and reminders keep me top of mind, and the platform is so easy to use.",
    name: "Jessica M.",
    role: "Realtor, Denver, CO"
  },
  {
    quote: "The anniversary and follow-up reminders make my past-client database feel active again instead of forgotten.",
    name: "Daniel R.",
    role: "Team Lead, Austin, TX"
  },
  {
    quote: "HomeLink gives our agents a simple, consistent way to stay visible without adding more admin work.",
    name: "Maya K.",
    role: "Broker, Phoenix, AZ"
  },
  {
    quote: "The combination of physical mail and engagement alerts creates real reasons to call clients at the right time.",
    name: "Chris T.",
    role: "Realtor, Tampa, FL"
  },
  {
    quote: "Our client retention jumped significantly within the first six months. Outstanding ROI.",
    name: "Sarah L.",
    role: "Managing Broker, Seattle, WA"
  }
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  const next = () => setActive((v) => (v + 1) % testimonials.length);
  const prev = () => setActive((v) => (v - 1 + testimonials.length) % testimonials.length);

  const t = testimonials[active];

  return (
    <section
      id="teams"
      className="w-full bg-[linear-gradient(135deg,#ffffff,#f5fcfd,#c4ebf2)] py-14 sm:py-[64px]"
    >
      <div className="container-shell grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionLabel>TRUSTED BY REAL ESTATE PROFESSIONALS</SectionLabel>
          <h2 className="mt-4 text-[clamp(2.75rem,5vw,4.25rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-[#0B1F3D]">
            Real stories.<br />
            Real results.
          </h2>
        </div>

        <div className="relative grid grid-cols-[44px_1fr_44px] items-center gap-3 sm:gap-5 pb-8">
          <button
            onClick={prev}
            className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#38B2D1] shadow-sm transition-transform hover:scale-105"
            aria-label="Previous testimonial"
          >
            <ArrowIcon className="h-4 w-4 rotate-180" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.26 }}
              className="grid min-h-[190px] items-center gap-5 rounded-xl bg-white px-7 py-7 shadow-sm sm:grid-cols-[76px_1fr] sm:px-8"
            >
              <div className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/images/testimonial-avatar-sharp.png"
                  fill
                  unoptimized
                  alt={t.name}
                  className="object-cover object-top"
                  sizes="76px"
                />
              </div>
              <div>
                <blockquote className="text-sm font-medium leading-relaxed text-[#355676]">
                  “{t.quote}”
                </blockquote>
                <strong className="mt-4 block text-sm font-bold text-[#0B1F3D]">
                  {t.name}
                </strong>
                <span className="mt-0.5 block text-xs font-semibold text-[#6380a0]">
                  {t.role}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={next}
            className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#38B2D1] shadow-sm transition-transform hover:scale-105"
            aria-label="Next testimonial"
          >
            <ArrowIcon className="h-4 w-4" />
          </button>

          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${i === active ? "bg-[#38B2D1] w-6" : "bg-[#AAD5DE]"
                  }`}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
