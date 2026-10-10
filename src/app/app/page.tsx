"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { MetricCard } from "@/components/ui/MetricCard";
import { CursorSpotlightCard } from "@/components/ui/CursorSpotlight";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Rocket,
  Box,
  FolderKanban,
  FileSpreadsheet,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
  Download,
  AlertTriangle,
  Layers,
  Cpu,
  Zap,
  Grid,
} from "lucide-react";
import { INITIAL_QUOTA, INITIAL_PROJECTS, SAMPLE_QC_RUN_WH402 } from "@/lib/data/sample-data";

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const quota = INITIAL_QUOTA;

  const quickLaunchApps = [
    { title: "Unbox™ Schematic", href: "/app/check", icon: Box, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30", desc: "Upload and auto-match rules" },
    { title: "QC Reports", href: "/app/reports/run-wh402", icon: FileSpreadsheet, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", desc: "Split-screen evidence review" },
    { title: "Projects", href: "/app/projects", icon: FolderKanban, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", desc: "Harness programs & documents" },
    { title: "Standards Suite", href: "/app/standards", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", desc: "IPC-620 & UL 508A rules" },
  ];

  const recentReports = [
    {
      id: "run-wh402",
      documentName: "WH-402_Avionics_Wiring_Manual_RevC.pdf",
      projectName: "Commercial Avionics Harness WD-777",
      standard: "IPC/WHMA-A-620D Class 3",
      date: "Today, 11:58 AM",
      result: "FAIL" as const,
      discrepancies: 6,
      critical: 2,
      major: 3,
      reviewer: "Lead QC Reviewer",
    },
    {
      id: "run-mcc01",
      documentName: "MCC_VFD_Panel_Schematic_v2.pdf",
      projectName: "Industrial MCC Panel Gen-4",
      standard: "UL 508A 3rd Edition",
      date: "Yesterday, 04:15 PM",
      result: "FAIL" as const,
      discrepancies: 4,
      critical: 1,
      major: 2,
      reviewer: "Harness Engineer",
    },
    {
      id: "run-tb200",
      documentName: "TB200_Relay_Interface_Rev1.pdf",
      projectName: "High-Voltage EV Battery Harness B-200",
      standard: "IPC/WHMA-A-620D Class 2",
      date: "Oct 01, 2026",
      result: "PASS" as const,
      discrepancies: 0,
      critical: 0,
      major: 0,
      reviewer: "Compliance Auditor",
    },
    {
      id: "run-harness88",
      documentName: "B777X_Cockpit_Audio_Bus_Schematic.pdf",
      projectName: "Commercial Avionics Harness WD-777",
      standard: "IPC/WHMA-A-620D Class 3",
      date: "Sep 29, 2026",
      result: "PASS" as const,
      discrepancies: 0,
      critical: 0,
      major: 0,
      reviewer: "Lead QC Reviewer",
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Spaceship Launchpad Welcome Banner */}
      <div className="p-7 rounded-2xl bg-gradient-to-r from-[#0d1424] via-[#090e1c] to-[#070912] border border-cyan-500/30 relative overflow-hidden shadow-2xl shadow-cyan-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                {organization?.name || "Spandsons Horizon Engineering Pvt. Ltd."}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-mono">Launchpad OS v1.0</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight" suppressHydrationWarning>
              Good morning, {user?.full_name || "Engineer"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              All QC applications are active. You have{" "}
              <span className="text-cyan-300 font-bold font-mono" suppressHydrationWarning>{quota.checks_remaining} checks remaining</span> in
              the current monthly cycle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/app/check">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono tracking-tight shadow-xl shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer">
                <Box className="w-4 h-4" />
                <span>Unbox New Schematic</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launch App Tiles (Spaceship Launchpad pattern) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLaunchApps.map((app) => {
          const Icon = app.icon;
          return (
            <Link key={app.title} href={app.href}>
              <CursorSpotlightCard className="p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${app.bg}`}>
                  <Icon className={`w-5 h-5 ${app.color}`} />
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-white truncate">{app.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{app.desc}</p>
                </div>
              </CursorSpotlightCard>
            </Link>
          );
        })}
      </div>

      {/* Primary KPI Metric Cards: Section 10 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <CursorSpotlightCard className="p-4">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Checks This Month
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-white font-mono">
            {quota.checks_used} / {quota.checks_limit}
          </div>
          <p className="text-[11px] text-cyan-400 font-mono mt-0.5">{quota.percent_used}% quota utilized</p>
        </CursorSpotlightCard>

        <CursorSpotlightCard className="p-4" spotlightColor="rgba(0, 240, 255, 0.15)">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Checks Remaining
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-cyan-300 font-mono" suppressHydrationWarning>
            {quota.checks_remaining}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Renews in 24 days</p>
        </CursorSpotlightCard>

        <CursorSpotlightCard className="p-4" spotlightColor="rgba(16, 185, 129, 0.15)">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Pass Rate
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-emerald-400 font-mono">
            82.4%
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-0.5 font-semibold">↑ +4.1% vs prev</p>
        </CursorSpotlightCard>

        <CursorSpotlightCard className="p-4" spotlightColor="rgba(59, 130, 246, 0.15)">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Active Projects
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-blue-400 font-mono">
            7
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Avionics & Control</p>
        </CursorSpotlightCard>

        <CursorSpotlightCard className="p-4" spotlightColor="rgba(168, 85, 247, 0.15)">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
            Reports
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-purple-400 font-mono">
            34
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">All signed QC reports (PDF/XLSX)</p>
        </CursorSpotlightCard>

        <CursorSpotlightCard className="p-4" spotlightColor="rgba(255, 51, 102, 0.2)">
          <p className="text-[10px] font-bold tracking-wider text-rose-400 uppercase font-mono flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            <span>Failed Checks</span>
          </p>
          <div className="mt-1.5 text-2xl font-extrabold text-rose-400 font-mono">
            2
          </div>
          <p className="text-[11px] text-rose-300/80 mt-0.5">Open critical flags</p>
        </CursorSpotlightCard>
      </div>

      {/* Critical Attention Banner */}
      <div className="p-4 rounded-2xl bg-rose-950/25 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-rose-500/5">
        <div className="flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-rose-200">
              Critical Discrepancy Flagged: WH-402 (Conductor W102)
            </h4>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Missing wire gauge callout violates IPC/WHMA-A-620D §4.1 Class 3 acceptance criteria.
            </p>
          </div>
        </div>
        <Link href="/app/reports/run-wh402">
          <Button variant="danger" size="sm">
            Review Finding D-001
          </Button>
        </Link>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Inspection Reports */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Recent Quality Reports
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Latest drawing compliance audits with human review sign-offs.
              </p>
            </div>
            <Link href="/app/history">
              <Button variant="ghost" size="xs" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                View All History
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0d121e] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090d16] text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Document / Schematic</th>
                    <th className="p-3.5">Standard</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Findings</th>
                    <th className="p-3.5">Reviewer</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200 line-clamp-1">
                          {report.documentName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {report.projectName} • {report.date}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                        {report.standard}
                      </td>
                      <td className="p-3.5">
                        <Badge variant="result" result={report.result} size="sm" />
                      </td>
                      <td className="p-3.5">
                        {report.discrepancies > 0 ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            {report.critical > 0 && (
                              <span className="text-rose-400 font-bold">
                                {report.critical}C
                              </span>
                            )}
                            {report.major > 0 && (
                              <span className="text-amber-400">
                                {report.major}M
                              </span>
                            )}
                            <span className="text-slate-400">
                              ({report.discrepancies} total)
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                            Clean
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {report.reviewer}
                      </td>
                      <td className="p-3.5 text-right">
                        <Link href={`/app/reports/${report.id}`}>
                          <Button variant="ghost" size="xs">
                            <Eye className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                            Report
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Launchpad System Status */}
        <div className="lg:col-span-4 space-y-6">
          <CursorSpotlightCard className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                System Processing Status
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mb-1">
                  <span>OCR & VECTOR WORKER #1</span>
                  <span className="text-emerald-400 font-bold">IDLE</span>
                </div>
                <p className="text-slate-300 font-medium text-xs">
                  Ready for new manual intake
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 mb-1">
                  <span>RULES COMPLIANCE SUITE</span>
                  <span className="text-cyan-400 font-bold">v1.4 ACTIVE</span>
                </div>
                <p className="text-slate-300 font-medium text-xs">
                  IPC/WHMA-A-620D & UL 508A mounted
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800">
              <Link href="/app/check">
                <Button variant="secondary" size="sm" className="w-full">
                  <Box className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  Unbox Schematic
                </Button>
              </Link>
            </div>
          </CursorSpotlightCard>

          {/* Quick Standards Widget */}
          <CursorSpotlightCard className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Active Organization Standards
              </span>
              <Link href="/app/standards" className="text-xs text-cyan-400 hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-mono text-slate-200">IPC/WHMA-A-620D</span>
                <span className="text-emerald-400 font-mono text-[11px]">142 rules</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-mono text-slate-200">UL 508A Panels</span>
                <span className="text-emerald-400 font-mono text-[11px]">88 rules</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-mono text-slate-200">Spandsons SOP E4</span>
                <span className="text-cyan-400 font-mono text-[11px]">36 rules</span>
              </div>
            </div>
          </CursorSpotlightCard>
        </div>
      </div>
    </div>
  );
}
