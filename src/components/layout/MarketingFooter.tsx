"use client";

import React from "react";
import Link from "next/link";
import { SpanqcLogo } from "@/components/brand/SpanqcLogo";

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#050608] text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <SpanqcLogo variant="full" size="sm" />
          </Link>
          <span className="hidden sm:inline-block w-px h-4 bg-slate-800" />
          <p className="text-xs text-slate-500">
            Automated Schematic & Wiring Diagram Quality Control
          </p>
        </div>

        {/* Minimal Nav Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-300">
          <Link href="/product" className="hover:text-cyan-400 transition-colors">
            Product
          </Link>
          <Link href="/standards" className="hover:text-cyan-400 transition-colors">
            Standards
          </Link>
          <Link href="/security" className="hover:text-cyan-400 transition-colors">
            Security
          </Link>
          <Link href="/how-it-works" className="hover:text-cyan-400 transition-colors">
            How It Works
          </Link>
          <Link href="/contact" className="hover:text-cyan-400 transition-colors">
            Contact
          </Link>
          <Link href="/app" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Launchpad →
          </Link>
        </nav>
      </div>

      {/* Bottom Legal / Copyright */}
      <div className="max-w-7xl mx-auto mt-6 pt-5 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>All systems operational • IPC/WHMA-A-620 & UL 508A Verified</span>
        </div>
        <div className="flex items-center gap-4">
          <p>© 2026 Spandsons Horizon Engineering Pvt. Ltd. All rights reserved.</p>
          <span className="text-slate-700">•</span>
          <span className="text-slate-600 font-mono">v1.0.0-pilot</span>
        </div>
      </div>
    </footer>
  );
}
