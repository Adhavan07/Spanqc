"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Zap,
  Activity,
  FileCode2,
  ShieldAlert,
} from "lucide-react";

interface WorkflowCardData {
  step: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  standardRef: string;
  accentColor: string;
  icon: React.ElementType;
  widgetType: "hash" | "scan" | "graph" | "rules" | "export";
}

const WORKFLOW_CARDS: WorkflowCardData[] = [
  {
    step: "01",
    badge: "INGESTION & ANTI-TAMPER",
    title: "Cryptographic Document Ingestion",
    subtitle: "Tenant-Isolated Vault & SHA-256 Hashing",
    description:
      "Schematic packages (PDF, vector SVG, ZIP archives) are validated against strict magic-byte signatures and cryptographically hashed with SHA-256 before processing. No unverified bytes enter the execution pipeline.",
    standardRef: "ISO 27001 & SOC-2 Tier 1 Storage Isolation",
    accentColor: "#00f0ff",
    icon: ShieldCheck,
    widgetType: "hash",
  },
  {
    step: "02",
    badge: "VECTOR & SPATIAL OCR",
    title: "Sub-Millimeter Coordinate Vectorization",
    subtitle: "High-DPI Spatial Text & Geometry Extraction",
    description:
      "PyMuPDF and spatial bounding algorithms isolate terminal blocks (TB-01, FB1, CMCU), pin numbers, and wire callouts. Text coordinates are mapped with sub-millimeter precision into a unified CAD coordinate space.",
    standardRef: "IEC 61082-1 Preparation of Electrotechnical Documents",
    accentColor: "#2f8cff",
    icon: Cpu,
    widgetType: "scan",
  },
  {
    step: "03",
    badge: "TOPOLOGY GRAPH ENGINE",
    title: "Deterministic Netlist Topology Diff",
    subtitle: "Graph-Based Wire & Continuity Extraction",
    description:
      "Converts raw lines and junction dots into a deterministic electrical netlist. Automatically identifies open circuits, floating stubs, transposed pinouts (e.g. Pin 75/76), and auxiliary relay terminal swaps.",
    standardRef: "IEEE Std 315 & ISO 11898 CAN Bus Topology",
    accentColor: "#a855f7",
    icon: Layers,
    widgetType: "graph",
  },
  {
    step: "04",
    badge: "CODE JUDGES — ZERO GUESSWORK",
    title: "Multi-Standard Rules Engine",
    subtitle: "Deterministic Compliance & Severity Scoring",
    description:
      "Every conductor gauge, color abbreviation, and overcurrent rating is cross-referenced against authoritative standards. The AI transcribes; pure Python code judges pass/fail with absolute mathematical certainty.",
    standardRef: "UL 508A § 28.1, NFPA 79 § 12.5, ISO 6722 Metric",
    accentColor: "#f5b73b",
    icon: Activity,
    widgetType: "rules",
  },
  {
    step: "05",
    badge: "AUDIT-READY DELIVERABLES",
    title: "Tamper-Evident Multi-Sheet Export",
    subtitle: "5-Tab Excel (.xlsx) & Certified PDF Reports",
    description:
      "Generates inspection workbooks formatted to the 13-column engineering audit standard with Summary, Wires, Findings, Flagged Gaps, and Components tabs, ready for quality sign-off.",
    standardRef: "ISO 9001 Quality Audit Compliance Record",
    accentColor: "#1ed6a0",
    icon: FileSpreadsheet,
    widgetType: "export",
  },
];

export function HorizontalStackCards() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      const progress = Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
      setScrollProgress(progress);
      const cardIndex = Math.min(
        WORKFLOW_CARDS.length - 1,
        Math.round((scrollLeft / maxScroll) * (WORKFLOW_CARDS.length - 1))
      );
      setActiveStep(cardIndex);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const scrollToCard = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = 460; // Card width + gap
    scrollRef.current.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
  };

  const handleScrollNav = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const delta = direction === "left" ? -460 : 460;
    scrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section
      className="relative w-full py-28 md:py-36 bg-[#040814] text-[#eaf1ff] border-t border-white/5 overflow-hidden"
      id="how-it-works"
    >
      {/* Background Ambience & Schematic Blueprint Grid */}
      <div className="absolute inset-0 bg-schematic-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(47,140,255,0.06)_0%,transparent_70%)] pointer-events-none blur-3xl" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,240,255,0.05)_0%,transparent_70%)] pointer-events-none blur-3xl" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.25)] text-[#00f0ff] text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>Deterministic Verification Workflow</span>
            </div>
            <h2 className="text-[clamp(30px,3.8vw,50px)] font-bold tracking-tight text-[#eaf1ff] leading-[1.12]">
              Horizontal Pipeline: From Raw CAD to Certified Audit
            </h2>
            <p className="text-[16px] text-[#a9b8d3] mt-4 leading-relaxed">
              Explore the five sequential verification stages. Drag or scroll horizontally across the pipeline
              to inspect how drawings are ingested, isolated, and audited without LLM hallucinations.
            </p>
          </div>

          {/* Interactive Navigation Controls */}
          <div className="flex items-center gap-4 self-start lg:self-end">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#7f93b8] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span className="text-[#00f0ff] font-bold">Phase {activeStep + 1}</span>
              <span>of {WORKFLOW_CARDS.length}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScrollNav("left")}
                disabled={!canScrollLeft}
                className="w-11 h-11 rounded-xl bg-[#091124] border border-white/10 flex items-center justify-center text-[#eaf1ff] hover:bg-[#0f1b38] hover:border-[#00f0ff]/50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollNav("right")}
                disabled={!canScrollRight}
                className="w-11 h-11 rounded-xl bg-[#091124] border border-white/10 flex items-center justify-center text-[#eaf1ff] hover:bg-[#0f1b38] hover:border-[#00f0ff]/50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stage Selector Pills (Clickable Stage Jumper) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {WORKFLOW_CARDS.map((card, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={card.step}
                onClick={() => scrollToCard(idx)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isActive
                    ? "bg-[#2f8cff]/20 text-[#eaf1ff] border-[#2f8cff] shadow-[0_0_16px_rgba(47,140,255,0.4)]"
                    : "bg-white/5 text-[#7f93b8] border-white/10 hover:text-[#a9b8d3] hover:bg-white/10"
                }`}
              >
                <span
                  style={{ backgroundColor: card.accentColor }}
                  className="w-2 h-2 rounded-full"
                />
                <span>
                  {card.step} {card.title.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* HORIZONTAL SCROLLING STACK TRACK */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-2 scrollbar-none cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {WORKFLOW_CARDS.map((card, idx) => {
            const Icon = card.icon;
            const isCurrent = activeStep === idx;

            return (
              <div
                key={card.step}
                className="snap-start shrink-0 w-[88vw] sm:w-[440px] md:w-[460px] lg:w-[480px] p-7 sm:p-8 rounded-3xl bg-[#081022]/90 border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col justify-between shadow-[0_16px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl group relative overflow-hidden"
              >
                {/* Luminous Top Glowing Rim */}
                <div
                  style={{
                    background: `linear-gradient(90deg, transparent, ${card.accentColor}, transparent)`,
                  }}
                  className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
                />

                {/* Card Header */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span
                      style={{
                        backgroundColor: `${card.accentColor}18`,
                        borderColor: `${card.accentColor}40`,
                        color: card.accentColor,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase border"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {card.badge}
                    </span>

                    <span className="text-3xl font-black font-mono text-white/20 group-hover:text-white/40 transition-colors">
                      {card.step}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-[#eaf1ff] mb-1 tracking-tight group-hover:text-white transition-colors">
                    {card.title}
                  </h3>
                  <div className="text-xs font-semibold text-[#7f93b8] mb-4 font-mono">
                    {card.subtitle}
                  </div>

                  <p className="text-sm text-[#a9b8d3] leading-relaxed mb-6">
                    {card.description}
                  </p>
                </div>

                {/* Embedded High-Tech Interactive CAD Micro-Widget */}
                <div className="my-2 p-4 rounded-2xl bg-[#040814] border border-white/10 font-mono text-xs">
                  {card.widgetType === "hash" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#7f93b8]">
                        <span>CRYPTO INTEGRITY CHECK</span>
                        <span className="text-[#1ed6a0] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-[10px] text-[#00f0ff] break-all">
                        SHA-256: da90d031b07d72ffe0c7548f3a7388ad61d1d14f22...
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Magic Bytes: %PDF-1.7 Vector</span>
                        <span>Tenant: AES-256 Isolated</span>
                      </div>
                    </div>
                  )}

                  {card.widgetType === "scan" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#7f93b8]">
                        <span>SPATIAL VECTOR COORDINATES</span>
                        <span className="text-[#2f8cff] font-bold">120 DPI RASTER</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1 text-[11px]">
                        <div className="flex justify-between text-[#eaf1ff]">
                          <span>BLOCK: [1 FB1 FUSEBOX]</span>
                          <span className="text-cyan-400">X: 789.0, Y: 91.2</span>
                        </div>
                        <div className="flex justify-between text-[#7f93b8]">
                          <span>BLOCK: [2 CMCU MASTER]</span>
                          <span className="text-amber-400">X: 812.2, Y: 1074.1</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {card.widgetType === "graph" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#7f93b8]">
                        <span>TOPOLOGY GRAPH TRACE</span>
                        <span className="text-[#a855f7] font-bold">NETLIST CONTINUITY</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>W101: FB1-F1 (30A) ➔ CA30:P1</span>
                          <span className="text-[#1ed6a0] font-bold">OK 3.0mm²</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-300">
                          <span>CN-52: Pin 75/76 Swap (CAN)</span>
                          <span className="text-rose-400 font-bold">INVERTED</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {card.widgetType === "rules" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#7f93b8]">
                        <span>DETERMINISTIC EVALUATION</span>
                        <span className="text-[#f5b73b] font-bold">64 RULES LOADED</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-white/5 space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between text-emerald-400">
                          <span>RULE-WG-001 Wire Gauge Sizing</span>
                          <span className="font-bold">PASS (100%)</span>
                        </div>
                        <div className="flex items-center justify-between text-rose-400">
                          <span>RULE-NET-004 Pin Transposition</span>
                          <span className="font-bold">FAIL (CRITICAL)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {card.widgetType === "export" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-[#7f93b8]">
                        <span>CERTIFIED AUDIT DELIVERABLES</span>
                        <span className="text-[#1ed6a0] font-bold">5-TAB WORKBOOK</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-cyan-300">
                          Summary.xlsx
                        </span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-emerald-300">
                          Findings.xlsx
                        </span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-amber-300">
                          Audit_Report.pdf
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Standard Reference */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[#7f93b8]">
                  <span className="font-mono text-[11px] truncate max-w-[280px]">
                    {card.standardRef}
                  </span>
                  <span
                    style={{ color: card.accentColor }}
                    className="font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    Details →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Pipeline Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              style={{
                width: `${Math.max(20, scrollProgress)}%`,
                background: "linear-gradient(90deg, #00f0ff, #2f8cff, #a855f7, #1ed6a0)",
              }}
              className="h-full rounded-full transition-all duration-150"
            />
          </div>
          <span className="text-xs font-mono text-[#7f93b8] shrink-0">
            Swipe or use arrows to navigate all 5 stages
          </span>
        </div>
      </div>
    </section>
  );
}

