"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ScrollHeroCanvas } from "@/components/marketing/ScrollHeroCanvas";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
import { SmoothScrollProvider } from "@/components/scroll/SmoothScrollProvider";
import { HorizontalCards } from "@/components/scroll/HorizontalCards";
import { StackedCards } from "@/components/scroll/StackedCards";
import { SpaceshipFooter } from "@/components/marketing/SpaceshipFooter";
import { ArrowRight, Sparkles } from "lucide-react";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
import { SpanqcLogo } from "@/components/brand/SpanqcLogo";

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const isNavVisible = useScrollDirection({ threshold: 8, topOffset: 50 });

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const children = document.querySelectorAll<HTMLElement>(".reveal-child");

    if (reducedMotion) {
      children.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const group = entry.target;
            const items = group.querySelectorAll<HTMLElement>(".reveal-child");
            items.forEach((item, idx) => {
              setTimeout(() => {
                item.classList.add("revealed");
              }, idx * 90);
            });
            obs.unobserve(group);
          }
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".reveal-group").forEach((group) => {
      observer.observe(group);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <SmoothScrollProvider>
      <div className="relative min-h-screen bg-[#050a17] text-[#a9b8d3] selection:bg-[#2f8cff]/30 selection:text-white">
        {/* 120-Frame Scroll-Scrubbed Canvas Engine */}
        <ScrollHeroCanvas />

        {/* Header Navigation */}
        <header
          className={`fixed top-0 left-0 right-0 z-30 px-[clamp(24px,6vw,96px)] py-5 bg-gradient-to-b from-[#050a17]/85 via-[#050a17]/50 to-transparent transition-transform duration-300 ease-in-out pointer-events-none ${isNavVisible ? "translate-y-0" : "-translate-y-full"
            }`}
        >
          <nav
            className="flex items-center justify-between w-full max-w-[1400px] mx-auto pointer-events-auto"
            aria-label="Main Navigation"
          >
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
              aria-label="SpanQC Home"
            >
              <SpanqcLogo variant="full" size="md" priority />
            </Link>

            <div className="flex items-center gap-5 sm:gap-7">
              <a
                href="#qc-detections"
                className="hidden md:inline-block text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors"
              >
                QC Detections
              </a>
              <a
                href="#how-it-works"
                className="hidden sm:inline-block text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors"
              >
                How it works
              </a>
              <a
                href="#pricing"
                className="hidden sm:inline-block text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors"
              >
                Pricing
              </a>
              <Link
                href="/login"
                className="text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center justify-center h-10 px-4.5 sm:px-5 bg-[#2f8cff] text-[#05101f] text-sm font-semibold rounded-lg shadow-[0_4px_16px_rgba(47,140,255,0.28)] hover:bg-[#4ba0ff] hover:shadow-[0_6px_24px_rgba(47,140,255,0.45)] transition-all cursor-pointer"
              >
                Request a demo
              </button>
              <Link
                href="/app"
                className="hidden lg:inline-flex items-center justify-center h-10 px-4.5 bg-white/10 hover:bg-white/15 text-[#eaf1ff] text-sm font-medium border border-white/15 rounded-lg transition-all"
              >
                Launch App
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Content Flow (z-10 above canvas) */}
        <main className="relative z-10 w-full">
          {/* 1. Hero, 100vh */}
          <section
            className="relative w-full min-h-screen h-screen flex flex-col justify-end pb-[clamp(56px,10vh,100px)]"
            id="hero"
          >
            <div className="copy-column reveal-group">
              <div className="copy-scrim" aria-hidden="true" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.25)] text-[#00f0ff] text-xs font-semibold uppercase tracking-wider mb-4 w-fit reveal-child">
                <Sparkles className="w-3.5 h-3.5" />
                IPC/WHMA-A-620 & UL 508A Verified
              </div>
              <h1 className="text-[clamp(40px,5.2vw,64px)] font-medium leading-[1.05] tracking-[-0.02em] text-[#eaf1ff] mb-6 reveal-child">
                Check every wiring diagram against your standards.
              </h1>
              <p className="text-[17px] leading-[1.6] text-[#a9b8d3] max-w-[500px] mb-8 reveal-child">
                Upload a diagram and your standards manual. Get a precision QC report that lists each
                wire discrepancy, terminal error, and clearance mismatch, ready to export as PDF or Excel.
              </p>
              <div className="flex flex-wrap items-center gap-4 reveal-child">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="inline-flex items-center justify-center h-11 px-6 bg-[#2f8cff] text-[#05101f] text-[15px] font-semibold rounded-lg shadow-[0_4px_16px_rgba(47,140,255,0.28)] hover:bg-[#4ba0ff] hover:shadow-[0_6px_24px_rgba(47,140,255,0.45)] transition-all cursor-pointer"
                >
                  Request a demo
                </button>
                <Link
                  href="/app/check"
                  className="inline-flex items-center justify-center h-11 px-5 text-[15px] font-medium text-[#eaf1ff] bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors flex items-center gap-2 group"
                >
                  <span>Try Live Check</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </section>

          {/* SECTION A: Pinned Horizontal Card Pipeline Scroll */}
          <HorizontalCards />

          {/* SECTION B: Pinned 3D Vertical Stacked Cards Deck */}
          <StackedCards />

          {/* 4. Bottom Action Callout */}
          <section className="relative w-full py-24 bg-gradient-to-b from-[#060811] to-[#04060d] text-center px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-[clamp(32px,4vw,48px)] font-bold text-[#eaf1ff] tracking-tight mb-5 leading-tight">
                Ready to verify your wire harness schematics?
              </h2>
              <p className="text-[17px] text-[#a9b8d3] mb-8 leading-relaxed">
                Upload your engineering diagrams to eliminate wiring redlines, cut scrap rates, and ensure 100% compliance.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsDemoModalOpen(true)}
                  className="inline-flex items-center justify-center h-12 px-7 bg-[#2f8cff] text-[#05101f] text-sm font-semibold rounded-xl shadow-[0_4px_20px_rgba(47,140,255,0.35)] hover:bg-[#4ba0ff] hover:shadow-[0_6px_28px_rgba(47,140,255,0.5)] transition-all cursor-pointer"
                >
                  Request a Custom Demo
                </button>
                <Link
                  href="/app/check"
                  className="inline-flex items-center justify-center h-12 px-6 text-sm font-medium text-[#eaf1ff] bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors"
                >
                  Launch Verification App →
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* 5. Spaceship-Inspired Enterprise Footer */}
        <SpaceshipFooter />

        {/* Modals */}
        <DemoRequestModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
      </div>
    </SmoothScrollProvider>
  );
}
