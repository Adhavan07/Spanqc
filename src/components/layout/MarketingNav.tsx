"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/Button";
import {
  Rocket,
  Layers,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Search,
  Box,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Command,
} from "lucide-react";
import { clsx } from "clsx";

export function MarketingNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  return (
    <header className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="spaceship-floating-nav rounded-2xl h-16 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand / Spaceship-Inspired Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400/20 via-blue-600/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 group-hover:border-cyan-400 transition-all shadow-lg shadow-cyan-500/10">
            <Rocket className="w-5 h-5 -rotate-45 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-white font-mono">
                SPANQC
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase tracking-wider">
                BY SPANDSONS
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5">
              AI-Assisted Wiring Diagram QC
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider">
          {/* Products Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <button className="flex items-center gap-1.5 py-2 text-slate-300 hover:text-white transition-colors cursor-pointer">
              <span>Products</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {productsOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-[#0d121e] border border-slate-700/80 p-3 shadow-2xl shadow-black/80 space-y-2 z-50">
                <Link
                  href="/product"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Hybrid Engine</h4>
                    <p className="text-[11px] text-slate-400 normal-case">
                      Deterministic standards + Multimodal AI vision
                    </p>
                  </div>
                </Link>

                <Link
                  href="/login"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unbox™ Ingestion</h4>
                    <p className="text-[11px] text-slate-400 normal-case">
                      Automated 1-click drawing setup & rule matching
                    </p>
                  </div>
                </Link>

                <Link
                  href="/login"
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Launchpad™</h4>
                    <p className="text-[11px] text-slate-400 normal-case">
                      Central command dashboard for all QC apps
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/how-it-works"
            className={clsx(
              "transition-colors",
              pathname === "/how-it-works" ? "text-cyan-400" : "text-slate-300 hover:text-white"
            )}
          >
            How It Works
          </Link>

          <Link
            href="/standards"
            className={clsx(
              "transition-colors",
              pathname === "/standards" ? "text-cyan-400" : "text-slate-300 hover:text-white"
            )}
          >
            Standards
          </Link>

          <Link
            href="/pricing"
            className={clsx(
              "transition-colors",
              pathname === "/pricing" ? "text-cyan-400" : "text-slate-300 hover:text-white"
            )}
          >
            Pricing
          </Link>

          <Link
            href="/security"
            className={clsx(
              "transition-colors",
              pathname === "/security" ? "text-cyan-400" : "text-slate-300 hover:text-white"
            )}
          >
            Security
          </Link>
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/login">
            <button className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800/60 transition-colors">
              Sign In
            </button>
          </Link>

          <Link href="/login">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono tracking-tight shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer">
              <Rocket className="w-3.5 h-3.5" />
              <span>Launchpad™</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 rounded-2xl bg-[#090c15] border border-slate-800 p-5 space-y-3">
          <Link
            href="/product"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Hybrid Engine
          </Link>
          <Link
            href="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            How It Works
          </Link>
          <Link
            href="/standards"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Standards
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/security"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold uppercase tracking-wider py-1.5 text-slate-300 hover:text-white"
          >
            Security
          </Link>
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="primary" size="sm" className="w-full bg-cyan-500 text-slate-950 font-bold">
                Launch Workspace
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
