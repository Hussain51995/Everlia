"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CloseIcon, PlayIcon } from "@/components/ui/Icons";

export function VideoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button onClick={onClose} className="absolute inset-0 bg-[#0d284d]/45 backdrop-blur-sm" aria-label="Close video" />
          <motion.div initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_40px_100px_rgba(13,40,77,.28)]">
            <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-card" aria-label="Close"><CloseIcon className="h-5 w-5" /></button>
            <div className="grid min-h-[380px] place-items-center bg-gradient-to-br from-white via-[#f5fcfd] to-[#c4ebf2] p-8 text-center">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ice-button text-white shadow-button"><PlayIcon className="h-7 w-7" /></span>
                <h3 className="mt-5 text-3xl font-medium tracking-[-0.04em] text-ink">HomeLink overview</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#587493]">Connect this modal to the final product demo or hosted walkthrough when the video asset is ready.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
