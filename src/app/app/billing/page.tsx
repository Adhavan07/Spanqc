"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  Sparkles,
  RefreshCw,
  FileCheck2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Box,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

interface TenantSummary {
  billing_status: string;
  is_billing_enabled: boolean;
  tenant: {
    id: string;
    name: string;
    plan: string;
    status: string;
    check_quota: number;
    quota_used: number;
    checks_remaining: number;
    percent_used: number;
  };
}

export default function BillingPage() {
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/billing/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.warn("Notice: could not load entitlements summary", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const standardsActive = [
    { name: "IPC/WHMA-A-620D", level: "Class 1, 2 & 3", status: "Active" },
    { name: "UL 508A", level: "Industrial Control Panels", status: "Active" },
    { name: "ISO 7200 / ASME Y14.1", level: "Drawing Sheet Standards", status: "Active" },
    { name: "Dual Comparative Netlist", level: "Master CAD vs Delivery Delivery", status: "Active" },
  ];

  return (
    <div className="space-y-6 pb-12 text-slate-100 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Platform Entitlements & Organization Status
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              UNLIMITED ENTERPRISE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Active quality control licenses, standards registry rules, and high-concurrency inspection throughput.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            disabled={isLoading}
            className="border-slate-800 hover:bg-slate-900"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/app/check">
            <Button
              variant="primary"
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold cursor-pointer"
            >
              <Box className="w-3.5 h-3.5 mr-1.5" />
              New Schematic Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Enterprise Status Banner */}
      <div className="p-6 rounded-3xl bg-[#0c101a] border border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#1b253b]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                ORGANIZATION TIER
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                ACTIVE
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              Enterprise Quality Assurance License
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Organization: <strong className="text-slate-200">{summary?.tenant?.name || "Spandsons Horizon"}</strong> • All rules and models unlocked
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center">
              <span className="text-[10px] font-mono text-cyan-300 block uppercase">QC CAPACITY</span>
              <span className="text-lg font-bold font-mono text-white">UNLIMITED</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span className="text-[10px] font-mono text-emerald-300 block uppercase">CONCURRENCY</span>
              <span className="text-lg font-bold font-mono text-white">HIGH SCALE</span>
            </div>
          </div>
        </div>

        {/* Quota & Utilization Stats */}
        <div className="py-5 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">STATUS</span>
            <span className="text-emerald-400 font-semibold font-mono text-sm flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Fully Unlocked
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">CHECKS COMPLETED</span>
            <span className="text-cyan-400 font-semibold font-mono text-sm block mt-0.5">
              {summary?.tenant?.quota_used ?? 0} Completed Inspections
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">PAYWALL / QUOTA BLOCKS</span>
            <span className="text-slate-300 font-semibold font-mono text-sm block mt-0.5">
              Disabled (Zero Blocks)
            </span>
          </div>
        </div>
      </div>

      {/* Enabled Standards Suite */}
      <div className="rounded-3xl bg-[#0c101a] border border-[#1b253b] p-6 shadow-2xl shadow-black/40">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-1">
          Active Engineering Compliance Standards
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Every inspection executes deterministic rule verification against these certified industry specifications.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {standardsActive.map((std, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{std.name}</h4>
                  <p className="text-[11px] text-slate-400">{std.level}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {std.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
