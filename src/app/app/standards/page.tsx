"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { SAMPLE_STANDARDS } from "@/lib/data/sample-data";
import { BookOpenCheck, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

export default function WorkspaceStandardsPage() {
  const [selectedStandard, setSelectedStandard] = useState(SAMPLE_STANDARDS[0].id);
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

  const filtered = rulesMock.filter(
    (r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Authoritative Standards & Rule Packs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active compliance rules evaluated during automated drawing quality control.
          </p>
        </div>
        <Link href="/app/check">
          <Button variant="primary" size="sm">
            Run Check Against Active Rules
          </Button>
        </Link>
      </div>

      {/* Standards Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {SAMPLE_STANDARDS.map((std) => (
          <button
            key={std.id}
            onClick={() => setSelectedStandard(std.id)}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
              std.id === selectedStandard
                ? "bg-[#0e1628] border-cyan-400 shadow-xl shadow-cyan-500/10"
                : "bg-[#0c101a] border-[#1b253b] hover:border-slate-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {std.code}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                v{std.version}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mt-3 tracking-tight">{std.name}</h4>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {std.description}
            </p>
          </button>
        ))}
      </div>

      {/* Active Rules List */}
      <div className="rounded-2xl border border-[#1b253b] bg-[#0c101a] overflow-hidden shadow-2xl shadow-black/40">
        <div className="p-6 border-b border-[#1b253b] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Rules in {activeStd.name} ({activeStd.code})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Codified criteria executed automatically during vector and raster parsing.
            </p>
          </div>

          <div className="w-full md:w-72">
            <SearchInput
              placeholder="Search rule code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </div>

        <div className="divide-y divide-[#1b253b]/80">
          {filtered.map((r) => (
            <div key={r.code} className="p-5 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">{r.code}</span>
                  <span className="text-xs font-mono text-slate-500">{r.section}</span>
                  <Badge variant="severity" severity={r.severity} size="xs" />
                </div>
                <h4 className="text-sm font-semibold text-white">{r.title}</h4>
                <p className="text-xs text-slate-400 max-w-2xl">{r.desc}</p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[#111726] border border-[#1b253b] text-slate-400 shrink-0">
                {r.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
