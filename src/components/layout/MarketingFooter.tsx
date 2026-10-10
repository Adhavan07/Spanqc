"use client";

import React from "react";
import Link from "next/link";
import { Rocket, ShieldCheck, FileCheck2, Cpu, Box } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#050608] text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Rocket className="w-4 h-4 -rotate-45" />
            </div>
            <span className="text-base font-extrabold text-white font-mono tracking-tight">SPANQC</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
              PLATFORM
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            Automated quality control platform for electrical schematics, wire harness assemblies, and industrial control panels. Built for aerospace, automotive, and defense manufacturers.
          </p>
          <div className="pt-2 text-[11px] text-slate-500 font-mono">
            Spandsons Horizon Engineering Pvt. Ltd. • All systems operational
          </div>
        </div>

        {/* Platform Links */}
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 font-mono">
            Platform
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/login" className="hover:text-cyan-400 transition-colors">
                Launchpad™ Workspace
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-cyan-400 transition-colors">
                Unbox™ Ingestion Flow
              </Link>
            </li>
            <li>
              <Link href="/product" className="hover:text-cyan-400 transition-colors">
                Hybrid AI & Deterministic Engine
              </Link>
            </li>
            <li>
              <Link href="/standards" className="hover:text-cyan-400 transition-colors">
                Standards Catalogue
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-cyan-400 transition-colors">
                Commercial Pricing
              </Link>
            </li>
          </ul>
        </div>

        {/* Trust & Security */}
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 font-mono">
            Trust & Compliance
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/security" className="hover:text-cyan-400 transition-colors">
                Security Architecture
              </Link>
            </li>
            <li>
              <Link href="/security" className="hover:text-cyan-400 transition-colors">
                Tenant Cryptographic Isolation
              </Link>
            </li>
            <li>
              <Link href="/resources" className="hover:text-cyan-400 transition-colors">
                Regression Test Benchmarks
              </Link>
            </li>
            <li>
              <Link href="/resources" className="hover:text-cyan-400 transition-colors">
                Audit Trail & QC Reports
              </Link>
            </li>
          </ul>
        </div>

        {/* Supported Standards */}
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 font-mono">
            Active Standards
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-300 font-mono text-[11px]">IPC-620D Class 1, 2, 3</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-300 font-mono text-[11px]">UL 508A Industrial Panels</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 font-mono text-[11px]">ISO 7200 / ASME Y14.1</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© 2026 Spandsons Horizon Engineering Pvt. Ltd. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/security" className="hover:text-slate-400">Security Architecture</Link>
          <Link href="/contact" className="hover:text-slate-400">Contact Engineering</Link>
          <span className="text-slate-600 font-mono">v1.0.0-pilot</span>
        </div>
      </div>
    </footer>
  );
}
