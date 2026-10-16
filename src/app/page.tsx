"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ScrollHeroCanvas } from "@/components/marketing/ScrollHeroCanvas";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";

export default function HomePage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

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
      { threshold: 0.25 }
    );

    document.querySelectorAll(".reveal-group").forEach((group) => {
      observer.observe(group);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#050a17] text-[#a9b8d3] selection:bg-[#2f8cff]/30 selection:text-white">
      {/* 120-Frame Scroll-Scrubbed Canvas Engine */}
      <ScrollHeroCanvas />

      {/* Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-30 px-[clamp(24px,6vw,96px)] py-5 bg-gradient-to-b from-[#050a17]/95 via-[#050a17]/80 to-transparent pointer-events-none">
        <nav className="flex items-center justify-between w-full max-w-[1400px] mx-auto pointer-events-auto" aria-label="Main Navigation">
          <Link href="/" className="text-[15px] font-semibold text-[#eaf1ff] tracking-tight hover:opacity-85 transition-opacity">
            Wiring Diagram QC Assistant
          </Link>
          <div className="flex items-center gap-6 sm:gap-7">
            <a href="#how-it-works" className="hidden sm:inline-block text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors">
              How it works
            </a>
            <Link href="/login" className="text-sm font-medium text-[#a9b8d3] hover:text-[#eaf1ff] transition-colors">
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
              className="hidden md:inline-flex items-center justify-center h-10 px-4.5 bg-white/10 hover:bg-white/15 text-[#eaf1ff] text-sm font-medium border border-white/15 rounded-lg transition-all"
            >
              Launch App
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Flow (z-10 above canvas) */}
      <main className="relative z-10 w-full">
        {/* 1. Hero, 100vh */}
        <section className="relative w-full min-h-screen h-screen flex flex-col justify-end pb-[clamp(56px,10vh,100px)]" id="hero">
          <div className="copy-column reveal-group">
            <div className="copy-scrim" aria-hidden="true" />
            <h1 className="text-[clamp(40px,5.2vw,64px)] font-medium leading-[1.05] tracking-[-0.02em] text-[#eaf1ff] mb-6 reveal-child">
              Check every wiring diagram against your standards.
            </h1>
            <p className="text-[17px] leading-[1.6] text-[#a9b8d3] max-w-[500px] mb-8 reveal-child">
              Upload a diagram and your standards manual. Get a QC report that lists each discrepancy, ready to export as PDF or Excel.
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
                className="inline-flex items-center justify-center h-11 px-5 text-[15px] font-medium text-[#eaf1ff] bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors"
              >
                Try Live Check →
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Empty spacer, 80vh */}
        <div className="h-[80vh] min-h-[80vh] w-full pointer-events-none" aria-hidden="true" />

        {/* 3. Example run (labeled "Example output" so it is not read as a claim) */}
        <section className="relative w-full min-h-screen flex flex-col justify-center py-16" id="example-run">
          <div className="copy-column reveal-group">
            <div className="copy-scrim" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93b8] mb-4 block reveal-child">
              Example output
            </span>

            <div className="flex items-center gap-5 px-6 py-4.5 mb-7 w-fit glass-panel reveal-child">
              <div className="flex items-center gap-2">
                <span className="status-dot dot-green" aria-hidden="true" />
                <span className="text-xl font-semibold text-[#eaf1ff] tracking-tight">94%</span>
                <span className="text-sm text-[#a9b8d3]">compliant</span>
              </div>
              <div className="w-[1px] h-6 bg-[rgba(80,130,220,0.25)]" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="status-dot dot-amber" aria-hidden="true" />
                <span className="text-xl font-semibold text-[#eaf1ff] tracking-tight">4%</span>
                <span className="text-sm text-[#a9b8d3]">warnings</span>
              </div>
              <div className="w-[1px] h-6 bg-[rgba(80,130,220,0.25)]" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span className="status-dot dot-red" aria-hidden="true" />
                <span className="text-xl font-semibold text-[#eaf1ff] tracking-tight">2%</span>
                <span className="text-sm text-[#a9b8d3]">errors</span>
              </div>
            </div>

            <p className="text-[17px] leading-[1.6] text-[#a9b8d3] reveal-child">
              Every warning and error in the report points to the connection that caused it.
            </p>
          </div>
        </section>

        {/* 4. How it works (four items, one line each, eyebrow label then sentence) */}
        <section className="relative w-full min-h-[120vh] flex flex-col justify-center py-20" id="how-it-works">
          <div className="copy-column reveal-group">
            <div className="copy-scrim" aria-hidden="true" />
            <div className="flex flex-col gap-9 pl-5 border-l border-[rgba(47,140,255,0.35)]">
              <div className="flex flex-col gap-1.5 reveal-child">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93b8]">
                  Detect
                </span>
                <p className="text-[17px] leading-[1.6] text-[#a9b8d3]">
                  Reads terminal blocks, wire labels and connections from the uploaded diagram.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 reveal-child">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93b8]">
                  Analyze
                </span>
                <p className="text-[17px] leading-[1.6] text-[#a9b8d3]">
                  Compares each connection against the rules in your standards manual.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 reveal-child">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93b8]">
                  Validate
                </span>
                <p className="text-[17px] leading-[1.6] text-[#a9b8d3]">
                  Marks each mismatch as a warning or an error and records where it is.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 reveal-child">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93b8]">
                  Report
                </span>
                <p className="text-[17px] leading-[1.6] text-[#a9b8d3]">
                  Exports the findings as a PDF or an Excel file.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Close */}
        <section className="relative w-full min-h-screen flex flex-col justify-center py-16 pb-32" id="close">
          <div className="copy-column reveal-group">
            <div className="copy-scrim" aria-hidden="true" />
            <p className="text-[clamp(32px,4.2vw,52px)] font-medium leading-[1.15] tracking-[-0.02em] text-[#eaf1ff] mb-7 reveal-child">
              Run one of your own diagrams through it.
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
                className="inline-flex items-center justify-center h-11 px-5 text-[15px] font-medium text-[#eaf1ff] bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors"
              >
                Launch Verification App →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Accessible Request a Demo Modal */}
      <DemoRequestModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
}
