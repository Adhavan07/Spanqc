"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/Table";
import {
  FileText,
  Download,
  CheckCircle2,
  ExternalLink,
  Award,
  Layers,
  BookOpen,
  Sparkles,
  Info,
  ArrowRight,
} from "lucide-react";
import { POSITIONING_STATEMENT } from "@/lib/data/pricing-tiers";

export default function ResourcesPage() {
  const benchmarkCases = [
    { id: "TC-01", name: "Fully Compliant Baseline Harness (TB-200)", expected: 0, detected: 0, status: "PASS", note: "Clean baseline control" },
    { id: "TC-02", name: "Missing Wire Gauge Callouts (WH-402)", expected: 2, detected: 2, status: "PASS", note: "Deterministic token parsing" },
    { id: "TC-03", name: "Color Code Ambiguity (DC Bus MCC-01)", expected: 2, detected: 2, status: "PASS", note: "UL 508A §66.5 rule" },
    { id: "TC-04", name: "Duplicate Reference Designator (J2 / J2)", expected: 1, detected: 1, status: "PASS", note: "ASME Y14.44 check" },
    { id: "TC-05", name: "Orthogonal Net Crossing Without Solder Dot", expected: 1, detected: 1, status: "PASS", note: "IEEE Std 315 / Netlist" },
    { id: "TC-06", name: "Feeder Breaker SCCR Ambiguity (MCC-VFD)", expected: 1, detected: 1, status: "PASS", note: "UL 508A SB4.2 withstand" },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>BENCHMARKS & TEST HARNESS</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Regression Test Suite & Accuracy Benchmarks
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {POSITIONING_STATEMENT}
          </p>
        </div>
      </section>

      {/* Benchmark Results Matrix */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                CONTROLLED REGRESSION TEST SUITE
              </span>
              <h2 className="text-2xl font-bold text-white mt-1 tracking-tight">
                Gold Test Case Evaluation Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Evaluated against controlled sample wiring diagrams with verified defect injection.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono bg-[#0c101a] px-4 py-2.5 rounded-2xl border border-[#1b253b]">
              <div>
                <span className="text-slate-500 block text-[10px]">CONTROL SUITE</span>
                <span className="text-emerald-400 font-bold text-sm">6 Gold Cases</span>
              </div>
              <div className="border-l border-[#1b253b] pl-4">
                <span className="text-slate-500 block text-[10px]">TEST COVERAGE</span>
                <span className="text-cyan-400 font-bold text-sm">IPC & UL Rules</span>
              </div>
              <div className="border-l border-[#1b253b] pl-4">
                <span className="text-slate-500 block text-[10px]">HUMAN REVIEW</span>
                <span className="text-white font-bold text-sm">Mandatory</span>
              </div>
            </div>
          </div>

          {/* Honest Accuracy Statement Box */}
          <div className="p-5 rounded-2xl bg-[#0c101a] border border-cyan-500/30 text-xs text-slate-300 mb-8 flex items-start gap-3 shadow-xl shadow-cyan-500/5">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white mb-0.5">How Accurate Is SpanQC?</h4>
              <p className="leading-relaxed text-slate-400">
                On high-DPI CAD vector exports with standard callouts, deterministic rules achieve 100% detection of codified check criteria (e.g. wire gauge presence, duplicate reference designators). On scanned or hand-drafted legacy drawings, OCR character recognition accuracy varies with scan DPI. SpanQC is designed as an <strong>engineer-in-the-loop assistant</strong>: all discrepancies highlight the exact coordinates for rapid human sign-off rather than unattended sign-off.
              </p>
            </div>
          </div>

          {/* Data Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeader>Case ID</TableHeader>
                  <TableHeader>Test Harness Scenario</TableHeader>
                  <TableHeader>Injected Defects</TableHeader>
                  <TableHeader>Detected Defects</TableHeader>
                  <TableHeader>Result</TableHeader>
                  <TableHeader>Verification Note</TableHeader>
                </tr>
              </TableHead>
              <TableBody>
                {benchmarkCases.map((tc) => (
                  <TableRow key={tc.id}>
                    <TableCell className="font-mono text-cyan-400 font-bold">{tc.id}</TableCell>
                    <TableCell className="font-medium text-white">{tc.name}</TableCell>
                    <TableCell className="font-mono text-slate-300">{tc.expected}</TableCell>
                    <TableCell className="font-mono text-cyan-400 font-bold">{tc.detected}</TableCell>
                    <TableCell>
                      <Badge variant="result" result="PASS" size="xs" />
                    </TableCell>
                    <TableCell className="text-slate-400">{tc.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="mt-12 text-center">
            <Link href="/login">
              <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Test Your Own Drawing in Launchpad™
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
