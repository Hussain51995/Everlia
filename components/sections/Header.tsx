"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/ui/Logo";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useSession } from "@/hooks/auth";
import { useAuthStore } from "@/stores/auth-store";

const links = [
  ["Home", "#top"],
  ["Features", "#features"],
  ["How It Works", "#how-it-works"],
  ["For Teams", "#teams"],
  ["Pricing", "#pricing"]
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  useSession();
  const user = useAuthStore((state) => state.user);
  const sessionReady = useAuthStore((state) => state.sessionReady);
  const isSignedIn = sessionReady && Boolean(user);

  return (
    <header id="top" className="sticky top-0 z-50 border-b border-[#C4EBF2] bg-white/95 backdrop-blur-md">
      <div className="container-shell flex h-[76px] items-center justify-between gap-6">
        <Logo variant="color" href="#top" height={48} />
        <nav className="hidden items-center gap-9 lg:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[13px] font-medium text-[#4b6a8a] transition-colors duration-150 hover:text-[#38B2D1]"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {!sessionReady ? (
            <div className="h-[42px] w-36 animate-pulse rounded-xl bg-[#F0FAFC]" aria-hidden />
          ) : isSignedIn ? (
            <PrimaryButton href="/dashboard" className="min-h-[42px] px-5 text-xs">
              Go to Dashboard
            </PrimaryButton>
          ) : (
            <>
              <a
                href="/sign-in"
                className="inline-flex min-h-[42px] items-center rounded-xl border border-[#C4EBF2] bg-white px-5 text-xs font-semibold text-[#10284d] transition-all hover:bg-[#F0FAFC]"
              >
                Sign In
              </a>
              <PrimaryButton href="/sign-up" className="min-h-[42px] px-5 text-xs">
                Get Started
              </PrimaryButton>
            </>
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-[#C4EBF2] bg-white text-[#10284d] lg:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-[#C4EBF2] bg-white px-4 pb-5 pt-3 lg:hidden"
          >
            <nav className="mx-auto flex w-full max-w-xl flex-col gap-1 rounded-[24px] border border-[#C4EBF2] bg-[#F0FAFC] p-3 shadow-lg">
              {links.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-[#10284d] hover:bg-white"
                >
                  {label}
                </a>
              ))}
              <div className="mt-2 grid gap-2">
                {!sessionReady ? (
                  <div className="h-11 animate-pulse rounded-xl bg-white" aria-hidden />
                ) : isSignedIn ? (
                  <PrimaryButton href="/dashboard" className="min-h-[44px] px-4 text-sm">
                    Go to Dashboard
                  </PrimaryButton>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/sign-in"
                      className="grid min-h-[44px] place-items-center rounded-xl border border-[#C4EBF2] bg-white text-sm font-semibold text-[#10284d]"
                    >
                      Sign In
                    </a>
                    <PrimaryButton href="/sign-up" className="min-h-[44px] px-4 text-sm">
                      Get Started
                    </PrimaryButton>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
