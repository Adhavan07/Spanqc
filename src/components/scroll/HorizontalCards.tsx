"use client";

import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SECTION_A_CARDS } from "@/lib/data/cards";
import { CardInputVisual, CardAiCoreVisual, CardOutputVisual } from "./SectionAVisuals";
import { ShieldCheck, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function HorizontalCards() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const wirePathRef = useRef<SVGPathElement>(null);
  const pulseDotRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

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
    // Only initialize pinned GSAP horizontal timeline on desktop when reduced motion is not requested
    if (isMobileOrReduced) return;

    const ctx = gsap.context(() => {
      const section = sectionRef.current;
      const track = trackRef.current;
      const wirePath = wirePathRef.current;
      const pulseDot = pulseDotRef.current;
      if (!section || !track) return;

      // Ensure fresh calculation of track width
      const getScrollDistance = () => track.scrollWidth - window.innerWidth;

      // Master Pinning & Horizontal Scroll Scrub Timeline
      const masterTween = gsap.to(track, {
        x: () => -getScrollDistance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          start: "top top",
          end: () => `+=${getScrollDistance()}`,
          scrub: 0.6, // Exact smooth follow-through requested
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            // Update 3-dot active stage based on progress thirds
            if (progress < 0.33) {
              setActiveStep(0);
            } else if (progress < 0.66) {
              setActiveStep(1);
            } else {
              setActiveStep(2);
            }

            // Sync SVG wire line drawing length and traveling pulse dot
            if (wirePath) {
              const pathLength = wirePath.getTotalLength();
              wirePath.style.strokeDashoffset = `${pathLength * (1 - progress)}`;

              if (pulseDot) {
                const point = wirePath.getPointAtLength(pathLength * progress);
                pulseDot.setAttribute("cx", `${point.x}`);
                pulseDot.setAttribute("cy", `${point.y}`);
              }
            }
          },
        },
      });

      // Per-Card Scale & Opacity via ScrollTrigger containerAnimation
      const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
      cards.forEach((card, i) => {
        if (i === 0) {
          // Card 1 starts at center (scale: 1, opacity: 1) and scales down as track translates left
          gsap.fromTo(
            card,
            { scale: 1, opacity: 1 },
            {
              scale: 0.88,
              opacity: 0.5,
              ease: "power1.out",
              scrollTrigger: {
                trigger: card,
                containerAnimation: masterTween,
                start: "left 20%",
                end: "left -40%",
                scrub: true,
              },
            }
          );
        } else if (i === cards.length - 1) {
          // Last card scales up from 0.88/0.5 to 1.0/1.0 as it centers
          gsap.fromTo(
            card,
            { scale: 0.88, opacity: 0.5 },
            {
              scale: 1,
              opacity: 1,
              ease: "power1.out",
              scrollTrigger: {
                trigger: card,
                containerAnimation: masterTween,
                start: "left 75%",
                end: "left 15%",
                scrub: true,
              },
            }
          );
        } else {
          // Middle cards scale up entering center, then down exiting center
          const cardTl = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              containerAnimation: masterTween,
              start: "left 85%",
              end: "right 15%",
              scrub: true,
            },
          });
          cardTl
            .fromTo(card, { scale: 0.88, opacity: 0.5 }, { scale: 1, opacity: 1, ease: "none" })
            .to(card, { scale: 0.88, opacity: 0.5, ease: "none" });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isMobileOrReduced]);

  const renderVisual = (index: number) => {
    switch (index) {
      case 0:
        return <CardInputVisual />;
      case 1:
        return <CardAiCoreVisual />;
      case 2:
        return <CardOutputVisual />;
      default:
        return null;
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-a-horizontal"
      aria-label="Section A: Horizontal Pipeline Cards"
      className={`relative w-full bg-[#071333] text-[#F3F6FB] overflow-x-clip ${
        isMobileOrReduced ? "py-16" : "h-screen flex flex-col justify-between"
      }`}
    >
      {/* Blueprint Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2F6BFF 1px, transparent 1px), linear-gradient(to bottom, #2F6BFF 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Header Bar */}
      <div className="relative z-10 pt-6 px-6 sm:px-12 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#2F6BFF]/15 border border-[#2F6BFF]/30 text-[#00F0FF] text-[11px] font-blueprint-mono uppercase tracking-wider mb-2">
            <Zap className="w-3 h-3" />
            <span>Pinned Horizontal Pipeline Stage</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-blueprint-heading uppercase">
            From Raw Drawing to Certified QC Output
          </h2>
        </div>

        {/* 3-Dot Active Stage Indicator */}
        <div
          role="region"
          aria-label="Horizontal Pipeline Stage Progress"
          className="flex items-center gap-3 bg-[#0B1F4B]/80 px-4 py-2 rounded-xl border border-[#2F6BFF]/30 backdrop-blur"
        >
          {SECTION_A_CARDS.map((card, idx) => (
            <div
              key={card.id}
              className={`flex items-center gap-2 transition-all duration-300 ${
                activeStep === idx ? "opacity-100 scale-105" : "opacity-40"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold font-blueprint-mono transition-colors ${
                  activeStep === idx
                    ? "bg-[#00F0FF] text-[#071333] shadow-[0_0_10px_#00F0FF]"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {idx + 1}
              </span>
              <span className="hidden sm:inline text-xs font-blueprint-mono font-semibold text-slate-200">
                {card.badge}
              </span>
              {idx < SECTION_A_CARDS.length - 1 && (
                <div className="w-4 h-[1px] bg-slate-600 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal Track or Mobile Carousel */}
      <div
        className={`relative w-full z-10 ${
          isMobileOrReduced
            ? "flex overflow-x-auto snap-x snap-mandatory px-6 py-8 gap-6 scrollbar-none"
            : "flex items-center h-[calc(100vh-180px)]"
        }`}
      >
        <div
          ref={trackRef}
          className={`flex items-center will-change-transform ${
            isMobileOrReduced
              ? "flex-row gap-6 w-max"
              : "gap-[6vw] px-[15vw] h-full"
          }`}
        >
          {SECTION_A_CARDS.map((card, idx) => (
            <article
              key={card.id}
              ref={(el) => {
                cardRefs.current[idx] = el;
              }}
              tabIndex={0}
              aria-label={`Card ${idx + 1} of 3: ${card.title}`}
              className={`relative flex-shrink-0 rounded-2xl bg-gradient-to-b from-[#0B1F4B] to-[#071333] border border-[#2F6BFF]/40 shadow-[0_10px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 flex flex-col justify-between overflow-hidden transition-shadow focus:outline-none focus:ring-2 focus:ring-[#00F0FF] ${
                isMobileOrReduced
                  ? "w-[85vw] max-w-[420px] snap-center"
                  : "w-[70vw] max-w-[1040px] h-[520px]"
              }`}
            >
              {/* Subtle Corner Wire Terminals */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#00F0FF]" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left Description Column (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-blueprint-mono font-bold bg-[#2F6BFF]/20 text-[#00F0FF] border border-[#2F6BFF]/50">
                        {card.stage}
                      </span>
                      <span className="text-xs font-blueprint-mono text-slate-400">
                        {card.tagline}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-blueprint-heading uppercase mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 font-blueprint-body">
                      {card.description}
                    </p>

                    {/* Standards Cited Pill Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {card.standardsCited.map((std) => (
                        <span
                          key={std}
                          className="px-2 py-0.5 rounded text-[10px] font-blueprint-mono bg-black/40 text-blue-200 border border-blue-500/20"
                        >
                          {std}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
                    {card.metrics.map((m) => (
                      <div key={m.label} className="p-2 rounded bg-black/30 border border-white/5">
                        <span className="block text-[9px] text-slate-400 font-blueprint-mono">
                          {m.label}
                        </span>
                        <span className="text-sm font-bold text-white font-blueprint-mono">
                          {m.value}
                        </span>
                        {m.unit && (
                          <span className="block text-[8px] text-blue-400 font-blueprint-mono">
                            {m.unit}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Interactive Visual Stage (7 Cols) */}
                <div className="lg:col-span-7 w-full flex items-center justify-center">
                  {renderVisual(idx)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Bottom Progress Wire Line with Light Pulse (Desktop GSAP Only) */}
      {!isMobileOrReduced && (
        <div className="relative z-10 w-full px-6 sm:px-12 pb-4">
          <div className="max-w-7xl mx-auto flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                <span>TRACE BUS LINE</span>
              </span>
              <span>SCROLL TO ADVANCE PIPELINE →</span>
            </div>

            <svg
              className="w-full h-4 overflow-visible"
              viewBox="0 0 1000 16"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Background trace line */}
              <line
                x1="0"
                y1="8"
                x2="1000"
                y2="8"
                stroke="#1B2B50"
                strokeWidth="2"
              />
              {/* Foreground animated light pulse line */}
              <path
                ref={wirePathRef}
                d="M 0 8 L 1000 8"
                stroke="url(#wireGradient)"
                strokeWidth="3"
                strokeDasharray="1000"
                strokeDashoffset="1000"
              />
              {/* Traveling light pulse dot */}
              <circle
                ref={pulseDotRef}
                cx="0"
                cy="8"
                r="4"
                fill="#00F0FF"
                className="filter drop-shadow-[0_0_8px_#00F0FF]"
              />
              <defs>
                <linearGradient id="wireGradient" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2F6BFF" />
                  <stop offset="50%" stopColor="#00F0FF" />
                  <stop offset="100%" stopColor="#16A34A" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}
