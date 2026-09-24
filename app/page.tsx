"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Problem } from "@/components/sections/Problem";
import { MailImpact } from "@/components/sections/MailImpact";
import { Testimonials } from "@/components/sections/Testimonials";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { Footer } from "@/components/sections/Footer";
import { VideoModal } from "@/components/sections/VideoModal";

export default function HomePage() {
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = videoOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [videoOpen]);

  return (
    <>
      <Header />
      <main className="bg-white">
        <Hero onVideo={() => setVideoOpen(true)} />
        <Features />
        <Problem />
        <MailImpact />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
      <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} />
    </>
  );
}
