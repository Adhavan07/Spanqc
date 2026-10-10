"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  FileCheck2,
  ArrowRight,
  Database,
  Lock,
  GitBranch,
  Terminal,
  Sparkles,
  Zap,
} from "lucide-react";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Hero Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>HYBRID DETERMINISTIC ARCHITECTURE</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Deterministic Rules × Multimodal AI Vision
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            SpanQC combines deterministic engineering rule engines with multimodal computer vision to eliminate
            hallucinations, guarantee audit repeatability, and keep human engineers in complete control.
          </p>
          <div className="mt-4 max-w-xl mx-auto px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            “AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.”
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Launch Workspace
              </Button>
            </Link>
            <Link href="/standards">
              <Button variant="outline" size="lg">
                View Standards Registry
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section className="py-20 border-b border-[#1b253b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              DUAL VERIFICATION LAYER
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 tracking-tight">
              Separating Fact from Generative Synthesis
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Unlike generic LLM wrappers, SpanQC enforces a strict mathematical boundary between observable schematic facts
              and generative computer vision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Deterministic Rules Engine */}
            <Card variant="elevated" hoverable className="p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Deterministic Rules Engine</h3>
                  <p className="text-xs text-slate-400 font-mono">Engine: NetworkX / Shapely Topology Solver</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Executes formal mathematical checks on electrical graphs and text tokens without model variance:
              </p>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Wire gauge missing check: token parsing of conductor callouts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Duplicate reference designators (e.g. two connectors named J2).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Terminal block continuity vs. netlist pin count parity.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Title block completeness (Rev, Date, CAGE code, Sign-off).</span>
                </li>
              </ul>
            </Card>

            {/* Multimodal AI Vision Engine */}
            <Card variant="elevated" hoverable className="p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Multimodal AI Vision</h3>
                  <p className="text-xs text-slate-400 font-mono">Vision: Sub-Millimeter Spatial Tokenizer</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Assists human reviewers with unstructured graphical interpretations:
              </p>
              <ul className="mt-4 space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Conductor crossing ambiguity (4-way cross vs. junction solder dot).</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Non-standard component schematic symbol recognition.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Damaged, blurred, or skewed legacy drawing restoration.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Plain-English discrepancy summaries with coordinate cross-references.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Conversion CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-r from-[#0d1424] via-[#090d1a] to-[#070912] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Ready to verify your wiring diagrams with sub-millimeter precision?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Sign in to Launchpad™ to upload schematics, run automated checks, and generate formal QC inspection reports.
            </p>
            <div className="mt-6">
              <Link href="/login">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Sign In to Launchpad™
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
