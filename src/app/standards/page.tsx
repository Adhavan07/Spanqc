"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SAMPLE_STANDARDS } from "@/lib/data/sample-data";
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Filter,
  Sparkles,
} from "lucide-react";

export default function StandardsPage() {
  const [selectedStandard, setSelectedStandard] = useState<string>(SAMPLE_STANDARDS[0].id);
  const [searchQuery, setSearchQuery] = useState("");

  const activeStd = SAMPLE_STANDARDS.find((s) => s.id === selectedStandard) || SAMPLE_STANDARDS[0];

  const rulesMock = [
    {
      code: "RULE-WG-001",
      section: "§4.1",
      title: "Minimum Conductor Cross-Section / Wire Gauge",
      desc: "Every conductor run must declare a nominal wire gauge (AWG or mm²) to verify ampacity and crimp tooling compliance.",
      category: "WIRE_GAUGE",
      severity: "CRITICAL" as const,
    },
    {
      code: "RULE-CC-003",
      section: "§66.5",
      title: "DC & AC Color Code Identification",
      desc: "Conductors must feature standard insulation color abbreviations (e.g. BLU for DC negative, BLK for phase, WHT for neutral).",
      category: "COLOR_CODE",
      severity: "MAJOR" as const,
    },
    {
      code: "RULE-CR-004",
      section: "§5.1.2",
      title: "Terminal Crimp Wire Barrel Range Match",
      desc: "Contact pin manufacturer wire accommodation range must encompass the specified conductor diameter.",
      category: "TERMINATION",
      severity: "MAJOR" as const,
    },
    {
      code: "RULE-NET-007",
      section: "§3.4.2",
      title: "Planar Net Crossing Without Junction Symbol",
      desc: "Crossing orthogonal net lines must include a bridge jump or explicit solder junction dot.",
      category: "ROUTING",
      severity: "MAJOR" as const,
    },
    {
      code: "RULE-RD-002",
      section: "ASME Y14.44",
      title: "Unique Reference Designator Uniqueness",
      desc: "Alphanumeric reference designator symbols (J1, P1, K1) must not be duplicated across components.",
      category: "LABELING",
      severity: "CRITICAL" as const,
    },
    {
      code: "RULE-TB-005",
      section: "ISO 7200",
      title: "Title Block Mandatory Approval & Revision",
      desc: "Engineering drawings must provide revision letter, drawing number, author, and approval signature before signoff.",
      category: "RETENTION",
      severity: "MINOR" as const,
    },
  ];

  const filteredRules = rulesMock.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>STANDARDS & COMPLIANCE REGISTRY</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Codified QC Rules & Industry Standards
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            All inspection checks are mathematically grounded in consensus engineering standards: IPC/WHMA-A-620D, UL 508A, and ISO 7200.
          </p>
          <div className="mt-4 max-w-xl mx-auto px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            “AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.”
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Standard Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {SAMPLE_STANDARDS.map((std) => {
              const isSelected = std.id === selectedStandard;
              return (
                <div
                  key={std.id}
                  onClick={() => setSelectedStandard(std.id)}
                  className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "border-cyan-400 bg-[#0e1628] shadow-xl shadow-cyan-500/10"
                      : "border-[#1b253b] bg-[#0c101a] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {std.code}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      v{std.version}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-3 tracking-tight">
                    {std.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {std.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Active Standard Rule Explorer */}
          <div className="rounded-2xl border border-[#1b253b] bg-[#0c101a] overflow-hidden shadow-2xl shadow-black/40">
            <div className="p-6 border-b border-[#1b253b] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {activeStd.name} ({activeStd.code})
                  </span>
                  <Badge variant="neutral" size="xs">
                    {rulesMock.length} RULES CODIFIED
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Active rules executed automatically during Unbox™ schematic ingestion.
                </p>
              </div>

              <div className="w-full md:w-72">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                  placeholder="Filter by rule code or clause..."
                />
              </div>
            </div>

            {/* Rules List */}
            <div className="divide-y divide-[#1b253b]/80">
              {filteredRules.map((rule) => (
                <div
                  key={rule.code}
                  className="p-6 hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {rule.code}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {rule.section}
                      </span>
                      <Badge variant="severity" severity={rule.severity} size="xs" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      {rule.title}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {rule.desc}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Link href="/login">
                      <Button variant="outline" size="xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                        Verify in App
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
