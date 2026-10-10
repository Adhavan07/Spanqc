"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { INITIAL_QUOTA } from "@/lib/data/sample-data";
import { Gauge, ArrowUpRight, Clock, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function UsagePage() {
  const quota = INITIAL_QUOTA;

  const usageByProject = [
    { name: "Commercial Avionics Harness WD-777", checks: 22, pct: 58 },
    { name: "Industrial MCC Panel Gen-4", checks: 11, pct: 29 },
    { name: "High-Voltage EV Battery Harness B-200", checks: 5, pct: 13 },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b253b] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Usage Quotas & Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inspection quota consumption, project breakdowns, and billing cycle velocity.
          </p>
        </div>

        <Link href="/app/billing">
          <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
            Manage Subscription
          </Button>
        </Link>
      </div>

      {/* Main Quota Meter Card */}
      <div className="p-7 rounded-3xl bg-gradient-to-r from-[#0d1424] via-[#090e1c] to-[#070912] border border-cyan-500/30 shadow-2xl shadow-cyan-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              CURRENT BILLING CYCLE (OCT 01 - OCT 31, 2026)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-white font-mono">
                {quota.checks_used}
              </span>
              <span className="text-lg text-slate-400 font-mono">
                / {quota.checks_limit} Checks Used
              </span>
              <span className="text-sm text-cyan-300 font-semibold font-mono" suppressHydrationWarning>
                ({quota.checks_remaining} Remaining)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Usage status is <span className="text-emerald-400 font-bold uppercase">{quota.status}</span>. Cycle renews in 24 days.
            </p>
          </div>

          <div className="w-full md:w-72 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Quota Consumed</span>
              <span className="text-white font-bold">{quota.percent_used}%</span>
            </div>
            <Progress value={quota.percent_used} variant="brand" size="md" />
          </div>
        </div>
      </div>

      {/* Breakdown by Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#0c101a] border border-[#1b253b] shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-4 pb-2 border-b border-[#1b253b]">
            Consumption by Engineering Project
          </h3>
          <div className="space-y-4">
            {usageByProject.map((proj) => (
              <div key={proj.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{proj.name}</span>
                  <span className="text-cyan-400 font-mono font-semibold">
                    {proj.checks} checks ({proj.pct}%)
                  </span>
                </div>
                <div className="w-full bg-[#070b14] rounded-full h-2 overflow-hidden border border-[#1b253b]">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${proj.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quota Rules Information Card */}
        <div className="p-6 rounded-2xl bg-[#0c101a] border border-[#1b253b] shadow-xl space-y-4 text-xs text-slate-400">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono pb-2 border-b border-[#1b253b]">
            Quota & Billing Policy
          </h3>
          <p className="leading-relaxed">
            • Each QC verification of a newly uploaded multi-page schematic consumes <strong>1 check credit</strong>.
          </p>
          <p className="leading-relaxed">
            • Reviewing past inspection reports, annotating findings, or exporting to PDF and Excel <strong>never consumes quota credits</strong>.
          </p>
          <p className="leading-relaxed">
            • Overage rate on your current Production plan is <strong>₹200 / check</strong>, automatically billed at the close of the monthly cycle.
          </p>
        </div>
      </div>
    </div>
  );
}
