"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  FileUp,
  Cpu,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Eye,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "Upload Wiring Diagram or Schematic Manual",
      desc: "Drag and drop multi-page PDFs, raster scanned schematics (PNG, JPG), or CAD exports. Our intake service computes cryptographic SHA-256 hashes for non-repudiation.",
      icon: FileUp,
      details: ["Supports up to 100MB per file", "Multi-sheet PDF support with automatic page indexing", "Client-side validation of file format and cryptographic SHA-256 seal"],
    },
    {
      num: "02",
      title: "Spatial OCR & Coordinate Mapping",
      desc: "High-density optical character recognition extracts textual callouts, wire tags, terminal numbers, and title blocks. Every token is anchored with sub-millimeter bounding polygon coordinates.",
      icon: Cpu,
      details: ["0.2mm bounding box coordinate precision", "Rotated and vertical wire callout detection", "Drawing title block key-value extraction"],
    },
    {
      num: "03",
      title: "Netlist Graph Topology Construction",
      desc: "Computer vision and topological line-following algorithms extract physical connections between connectors, relays, terminal strips, and ground lugs.",
      icon: Layers,
      details: ["Detects planar wire crossings vs. solder junction dots", "Maps connector pin-to-pin signal nets", "Identifies branch splits and splice nodes"],
    },
    {
      num: "04",
      title: "Rule Pack Verification Against Standards",
      desc: "The deterministic rule engine evaluates the netlist against codified engineering standards: IPC/WHMA-A-620D Class 3, UL 508A, or custom manufacturer SOPs.",
      icon: ShieldCheck,
      details: ["Conductor gauge ampacity validation", "Insulation color code compliance", "Duplicate reference designator detection"],
    },
    {
      num: "05",
      title: "Interactive Review, Decision & Export",
      desc: "Inspect discrepancies in a synchronized split-screen view. Confirm defects, reject false positives, and download structured PDF inspection reports or multi-sheet Excel workbooks.",
      icon: FileSpreadsheet,
      details: ["Human-in-the-loop review audit trail", "1-click PDF QC Report with findings summary", "Structured Excel report with raw finding coordinates"],
    },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>STEP-BY-STEP VERIFICATION PIPELINE</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            How SpanQC Validates Wiring Schematics
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Follow the complete engineering path from initial drawing intake to verified quality decision.
          </p>
          <div className="mt-4 max-w-xl mx-auto px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            “AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.”
          </div>
        </div>
      </section>

      {/* Steps Container */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="flex flex-col md:flex-row gap-6 p-7 rounded-2xl bg-[#0c101a] border border-[#1b253b] hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-200"
              >
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="mt-3 text-xs font-mono font-bold text-slate-500">
                    {step.num}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                    {step.desc}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#1b253b]/80 space-y-2">
                    {step.details.map((detail, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next step CTA */}
        <div className="mt-16 text-center">
          <Link href="/login">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Try Unbox™ with Your Diagram
            </Button>
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
