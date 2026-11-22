"use client";

import React from "react";
import Link from "next/link";
import { SpanqcLogo } from "@/components/brand/SpanqcLogo";

export function SpaceshipFooter() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#04060c] text-[#7f93b8] py-8 px-6 sm:px-8 lg:px-12 selection:bg-[#2f8cff]/30">
      <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand & Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <SpanqcLogo variant="full" size="sm" />
          </Link>
          <span className="hidden sm:inline-block w-px h-4 bg-white/10" />
          <p className="text-xs text-[#627394]">
            Automated Schematic & Wiring Diagram Quality Control
          </p>
        </div>

        {/* Minimal Nav Links */}
        <nav className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-[#8ea0c2]">
          <Link href="/product" className="hover:text-white transition-colors">
            Product
          </Link>
          <Link href="/standards" className="hover:text-white transition-colors">
            Standards
          </Link>
          <Link href="/security" className="hover:text-white transition-colors">
            Security
          </Link>
          <Link href="/how-it-works" className="hover:text-white transition-colors">
            How It Works
          </Link>
          <Link href="/contact" className="hover:text-white transition-colors">
            Contact
          </Link>
          <Link href="/app" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Launchpad →
          </Link>
        </nav>
      </div>

      {/* Bottom Legal / Copyright */}
      <div className="max-w-[1360px] mx-auto mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#506080]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>All systems operational • IPC/WHMA-A-620 & UL 508A Verified</span>
        </div>
        <div className="flex items-center gap-4">
          <p>© 2026 Spandsons Horizon Engineering Pvt. Ltd. All rights reserved.</p>
          <span className="text-white/10">•</span>
          <span className="text-[#3e4c66] font-mono">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
