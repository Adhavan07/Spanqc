"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_B_CARDS } from "@/lib/data/cards";
import { WorkflowMicroVisual } from "./SectionBVisuals";
import { Check, ShieldCheck, ArrowRight, Layers, Sparkles } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function StackedCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [isMobileOrReduced, setIsMobileOrReduced] = useState(false);

  useEffect(() => {
    const checkMedia = () => {
      const isMobile = window.innerWidth < 1024;
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsMobileOrReduced(isMobile || prefersReduced);
    };
    checkMedia();
    window.addEventListener("resize", checkMedia);
    return () => window.removeEventListener("resize", checkMedia);
  }, []);

  useLayoutEffect(() => {
    if (isMobileOrReduced) return;

    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
      if (!section || cards.length === 0) return;

      const totalCards = cards.length;
      // Scroll distance: ~60vh per card + 40vh hold for final card = 460vh
      const scrollDistance = totalCards * window.innerHeight * 0.6 + window.innerHeight * 0.4;

      // Master Timeline scrubbed by ScrollTrigger
      const masterTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          start: "top top",
          end: `+=${scrollDistance}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            // Map progress to active step (0 to totalCards - 1)
            const currentStep = Math.min(
              totalCards - 1,
              Math.floor(self.progress * totalCards)
            );
            setActiveStep(currentStep);
          },
        },
      });

      // Position Initial State:
      // Card 0 starts active at 0,0,0
      gsap.set(cards[0], {
        transformOrigin: "center top",
        y: 0,
        z: 0,
        rotateX: 0,
        scale: 1,
        opacity: 1,
        filter: "blur(0px)",
        visibility: "visible",
      });

      // Subsequent cards start off-screen below: translateY(100vh) rotateX(12deg) opacity 0
      for (let i = 1; i < totalCards; i++) {
        gsap.set(cards[i], {
          transformOrigin: "center top",
          y: "100vh",
          z: 0,
          rotateX: 12,
          scale: 1,
          opacity: 0,
          filter: "blur(0px)",
          visibility: "visible",
        });
      }

      // Build animation segments for each card transition (card 1 through totalCards - 1)
      cards.forEach((card, i) => {
        if (i === 0) return;

        // At each step:
        // 1. Current card moves up from translateY(100vh) rotateX(12deg) -> translateY(0) rotateX(0)
        // 2. All previous cards recede:
        //    depth = (i - prevIndex)
        //    translateZ(-120px * depth), translateY(-24px * depth), scale(1 - 0.06 * depth), opacity max(0, 1 - 0.25 * depth)
        //    blur if depth >= 2, hide if depth > 3
        const stepTime = i * 1.0;

        masterTl.to(
          card,
          {
            y: 0,
            rotateX: 0,
            z: 0,
            scale: 1,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power2.out",
            duration: 1.0,
          },
          stepTime
        );

        // Update all prior cards to recede deeper
        for (let prevIdx = 0; prevIdx < i; prevIdx++) {
          const depth = i - prevIdx;
          const prevCard = cards[prevIdx];
          const isDeep = depth > 3;

          masterTl.to(
            prevCard,
            {
              z: -120 * depth,
              y: -24 * depth,
              scale: Math.max(0.7, 1 - 0.06 * depth),
              opacity: isDeep ? 0 : Math.max(0, 1 - 0.25 * depth),
              filter: depth >= 2 ? "blur(2px)" : "blur(0px)",
              ease: "power2.out",
              duration: 1.0,
            },
            stepTime
          );
        }
      });

      // 40vh hold on last card
      masterTl.to({}, { duration: 0.6 });
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobileOrReduced]);

  const getAccentBorder = (accent: string) => {
    switch (accent) {
      case "green":
        return "border-[#16A34A]/50 text-[#16A34A]";
      case "red":
        return "border-[#DC2626]/50 text-[#DC2626]";
      case "orange":
        return "border-[#F59E0B]/50 text-[#F59E0B]";
      case "blue":
        return "border-[#3B82F6]/50 text-[#3B82F6]";
      case "electric":
      default:
        return "border-[#2F6BFF]/50 text-[#00F0FF]";
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-b-stacked"
      aria-label="Section B: 8-Step Vertical Stacked Workflow"
      className={`relative w-full bg-[#050A17] text-[#F3F6FB] ${
        isMobileOrReduced ? "py-20 px-6" : "h-screen flex items-center overflow-x-clip"
      }`}
    >
      {/* Blueprint Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2F6BFF 1px, transparent 1px), linear-gradient(to bottom, #2F6BFF 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Shared Transition Motif: Vertical Wire Flowing from Section A */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-14 bg-gradient-to-b from-[#16A34A] via-[#00F0FF] to-transparent pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#16A34A] shadow-[0_0_8px_#16A34A]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Sticky Title + Vertical 8-Dot Rail */}
          <div className="lg:col-span-5 flex flex-col justify-between py-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2F6BFF]/15 border border-[#2F6BFF]/30 text-[#00F0FF] text-[11px] font-blueprint-mono uppercase tracking-wider mb-3">
                <Layers className="w-3.5 h-3.5" />
                <span>3D Stacked Deck • 8-Step Verification</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-blueprint-heading uppercase leading-none mb-3">
                End-To-End Schematic QC Lifecycle
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6 font-blueprint-body">
                Each sheet proceeds through cryptographic isolation, server-side validated prompt
                orchestration, sub-millimeter defect mapping, and immutable audit sign-off.
              </p>
            </div>

            {/* Vertical 8-Dot Rail with Active Pulse (Desktop) */}
            <div
              role="region"
              aria-label="Workflow Step Progress Rail"
              className="space-y-3 bg-[#071333]/80 p-4 rounded-xl border border-[#2F6BFF]/20 backdrop-blur"
            >
              {SECTION_B_CARDS.map((card, idx) => {
                const isActive = activeStep === idx;
                const isPassed = activeStep > idx;

                return (
                  <div
                    key={card.id}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      isActive ? "opacity-100 translate-x-1" : isPassed ? "opacity-75" : "opacity-35"
                    }`}
                  >
                    <div
                      aria-label={`Step ${card.step} of 8: ${card.title}`}
                      className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                        isActive
                          ? "bg-[#00F0FF] text-[#071333] shadow-[0_0_12px_#00F0FF] scale-110"
                          : isPassed
                          ? "bg-[#16A34A] text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : card.step}
                      {isActive && (
                        <span className="absolute -inset-1 rounded-full border border-[#00F0FF] animate-ping opacity-75" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-mono font-semibold transition-colors ${
                          isActive ? "text-white" : "text-slate-400"
                        }`}
                      >
                        {card.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono hidden sm:block">
                        {card.standardRef}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: 3D Stage with perspective: 1400px (Desktop) or Sticky Stack (Mobile) */}
          <div className="lg:col-span-7 w-full">
            {isMobileOrReduced ? (
              /* Mobile/Tablet Fallback: Native Vertical Sticky Stack */
              <div className="space-y-6">
                {SECTION_B_CARDS.map((card, idx) => (
                  <div
                    key={card.id}
                    className="sticky top-20 rounded-2xl bg-gradient-to-b from-[#0B1F4B] to-[#071333] border border-[#2F6BFF]/40 shadow-2xl p-6"
                    style={{ zIndex: idx + 1 }}
                  >
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                      <span className="text-xs font-mono font-bold text-[#00F0FF]">{card.tag}</span>
                      <span className="text-[10px] font-mono text-slate-400">Step {card.step}/8</span>
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase font-['Barlow_Condensed'] mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-300 mb-4">{card.technicalDetails}</p>
                    <WorkflowMicroVisual type={card.microType} />
                  </div>
                ))}
              </div>
            ) : (
              /* Desktop: GSAP 3D Stacked Deck with perspective: 1400px */
              <div
                ref={stageRef}
                style={{ perspective: "1400px" }}
                className="relative w-full h-[540px] flex items-center justify-center"
              >
                {SECTION_B_CARDS.map((card, idx) => (
                  <div
                    key={card.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el;
                    }}
                    style={{
                      transformStyle: "preserve-3d",
                      zIndex: idx + 10,
                    }}
                    tabIndex={0}
                    aria-label={`Workflow Card ${card.step} of 8: ${card.title}`}
                    className={`absolute inset-0 m-auto w-full max-w-[580px] h-[500px] rounded-2xl bg-gradient-to-b from-[#0B1F4B] via-[#09183E] to-[#071333] border shadow-[0_15px_50px_rgba(0,0,0,0.7)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden will-change-transform focus:outline-none focus:ring-2 focus:ring-[#00F0FF] ${getAccentBorder(
                      card.accent
                    )}`}
                  >
                    {/* Peeking Deck Header Bar */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
                        <span className="text-xs font-blueprint-mono font-bold tracking-wider text-[#00F0FF]">
                          {card.tag}
                        </span>
                      </div>
                      <span className="text-[11px] font-blueprint-mono font-bold px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                        STAGE {card.step} / 08
                      </span>
                    </div>

                    {/* Card Content Details */}
                    <div className="my-3">
                      <h3 className="text-2xl font-extrabold text-white tracking-tight font-blueprint-heading uppercase mb-2">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-blueprint-body mb-3">
                        {card.shortDesc}
                      </p>
                      <div className="p-3 rounded-lg bg-black/30 border border-blue-500/20 text-xs text-slate-300 font-blueprint-body leading-relaxed">
                        {card.technicalDetails}
                      </div>
                    </div>

                    {/* Interactive Micro-Animation Visual */}
                    <div className="w-full">
                      <WorkflowMicroVisual type={card.microType} />
                    </div>

                    {/* Card Footer Standard Citation */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 text-blue-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00F0FF]" />
                        <span>{card.standardRef}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold">Strict Rule Invariant</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
