"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Accordion";
import { Check, ShieldCheck, Sparkles, Box, ArrowRight, Zap, Lock, Cpu } from "lucide-react";

export default function PricingPage() {
  const faqItems = [
    {
      id: "faq-1",
      title: "What is included with SPANQC access?",
      content:
        "All engineering capabilities are fully unlocked: automated schematic OCR transcription, deterministic rule engine verification, dual comparative audit of delivery packages (SVGs/JPGs), IPC/WHMA-A-620 and UL 508A compliance checks, and cryptographic audit reports.",
    },
    {
      id: "faq-2",
      title: "Are there any limits or monthly quota caps?",
      content:
        "No. The platform is configured for unlimited diagram checks with high-concurrency architecture capable of supporting concurrent engineering teams without paywalls or credit restrictions.",
    },
    {
      id: "faq-3",
      title: "Are customer wiring diagrams used to train models?",
      content:
        "Strictly no. Customer drawings are processed in ephemeral containers, encrypted in transit and at rest, and are never used to train public or proprietary models.",
    },
    {
      id: "faq-4",
      title: "Can we integrate custom proprietary internal engineering SOPs?",
      content:
        "Yes, our rules engine supports custom rule pack ingestion to codify your proprietary design standards alongside IPC, UL, and ISO standards.",
    },
  ];

  const enterpriseFeatures = [
    "Unlimited automated schematic diagram checks",
    "Dual comparative audit (Master CAD vs. Redrawn Delivery)",
    "IPC/WHMA-A-620 Class 1, 2, and 3 rule evaluation",
    "UL 508A Industrial Control Panel compliance",
    "Deterministic code verification (rules.py - zero hallucinations)",
    "Cryptographic SHA-256 evidence chain of custody",
    "Multi-sheet cross-reference continuity checker",
    "Full Excel, PDF & JSON audit reports export",
    "Private tenant data isolation",
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-16 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>ENTERPRISE TIER — 100% UNLOCKED</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Unlimited Quality Control for Engineering Teams
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Full access to deterministic wiring diagram validation, dual comparative audits, and aerospace/industrial standards compliance with zero paywalls.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app/check">
              <Button
                variant="primary"
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Launch Schematic QC
              </Button>
            </Link>
            <Link href="/app">
              <Button
                variant="outline"
                size="lg"
                className="border-slate-700 hover:bg-slate-800 text-white cursor-pointer"
                leftIcon={<Box className="w-4 h-4 text-cyan-400" />}
              >
                Open Launchpad™
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Unlocked Entitlements Overview Card */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl border border-cyan-500/30 bg-[#0c101a] shadow-2xl shadow-cyan-500/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1b253b]">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  FULL PLATFORM SUITE
                </span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  Enterprise Inspection License
                </h3>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE & UNLOCKED
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {enterpriseFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-200">{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-[#1b253b] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Deterministic standards verification • Zero machine pass false alarms</span>
              </div>
              <Link href="/app/check">
                <Button variant="primary" size="md" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">
                  Start Inspection
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto px-4 mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8 tracking-tight">
            Frequently Asked Questions
          </h2>
          <Accordion items={faqItems} />
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
