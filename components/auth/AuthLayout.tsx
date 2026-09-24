"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { SparklesIcon, CheckCircleIcon, ArrowIcon } from "@/components/ui/Icons";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-[#F0FAFC]">
      <div className="flex w-full flex-col justify-between px-6 py-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#557393] transition-colors hover:text-[#38B2D1]"
          >
            Back to website
            <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C4EBF2] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#38B2D1] shadow-xs">
                <SparklesIcon className="h-3.5 w-3.5" />
                HomeLink Portal
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B1F3D] sm:text-4xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-[#557393]">{subtitle}</p>
            </div>

            <div className="rounded-3xl border border-[#C4EBF2] bg-white p-6 shadow-xl shadow-[#38b2d1]/5 sm:p-8">
              {children}
            </div>
          </motion.div>
        </div>

        <div className="text-center text-xs text-[#557393] lg:text-left">
          © {new Date().getFullYear()} HomeLink™ Technologies Inc. All rights reserved.
        </div>
      </div>

      <div className="hidden lg:relative lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:overflow-hidden lg:bg-gradient-to-br lg:from-[#0B1F3D] lg:via-[#10284D] lg:to-[#1a3d6e] lg:p-16 lg:text-white">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#38B2D1]/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[#43c5e6]/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#43c5e6] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#38B2D1]"></span>
            </span>
            Automated Client Retention CRM
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#38B2D1] text-white shadow-lg">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">94% Client Retention Rate</h3>
                <p className="text-xs text-[#C4EBF2]">Personalized direct mail + digital touchpoints</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                "Automated home anniversary & birthday mailers",
                "High-conversion QR code tracking & CRM alerts",
                "Seamless integration with MLS & contact lists",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#38B2D1]/30 text-[#43c5e6]">
                    <CheckCircleIcon className="h-4 w-4" />
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <p className="text-xs italic leading-relaxed text-white/80">
                &ldquo;HomeLink transformed how our brokerage keeps in touch with past clients. The direct mail postcards sent automatically got us 14 repeat listings this quarter alone!&rdquo;
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#43c5e6]">
                <span>— Sarah Jenkins, Principal Broker</span>
                <span>★ 4.9/5 Rating</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          <div>
            <div className="text-2xl font-black text-white">2.8M+</div>
            <div className="text-[11px] text-[#C4EBF2]">Mailers Sent</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">4.8x</div>
            <div className="text-[11px] text-[#C4EBF2]">Average ROI</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">12k+</div>
            <div className="text-[11px] text-[#C4EBF2]">Top Realtors</div>
          </div>
        </div>
      </div>
    </div>
  );
}
