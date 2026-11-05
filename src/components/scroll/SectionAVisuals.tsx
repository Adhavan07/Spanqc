"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  ShieldCheck,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
  Zap,
} from "lucide-react";

/** Card 1: Fanning Blueprint Document Thumbnails */
export function CardInputVisual() {
  return (
    <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center overflow-hidden rounded-xl bg-[#071333]/70 border border-[#2F6BFF]/30 p-4">
      {/* Blueprint Grid Watermark */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2F6BFF 1px, transparent 1px), linear-gradient(to bottom, #2F6BFF 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Fan-Out Document Layers */}
      <div className="relative w-[280px] sm:w-[320px] h-[220px]">
        {/* Layer 3: Back CAD Sheet (Tilted Left) */}
        <motion.div
          initial={{ rotate: -8, x: -16, y: 10, opacity: 0.6 }}
          animate={{ rotate: [-8, -10, -8], x: [-16, -20, -16] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-lg bg-[#0B1F4B] border border-[#2F6BFF]/40 shadow-xl p-3 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center text-[10px] text-blue-300 font-mono">
            <span>SHEET 03 / HYDRAULIC PILOT</span>
            <span className="text-[#00F0FF]">REV D</span>
          </div>
          <div className="space-y-1.5 opacity-40">
            <div className="h-1.5 bg-[#2F6BFF] rounded w-3/4" />
            <div className="h-1.5 bg-[#2F6BFF] rounded w-1/2" />
            <div className="h-1.5 bg-[#2F6BFF] rounded w-5/6" />
          </div>
          <div className="text-[9px] text-slate-400 font-mono">ISO 11898 BUS TOPOLOGY</div>
        </motion.div>

        {/* Layer 2: Middle CAD Sheet (Tilted Right) */}
        <motion.div
          initial={{ rotate: 7, x: 14, y: 5, opacity: 0.8 }}
          animate={{ rotate: [7, 9, 7], x: [14, 18, 14] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute inset-0 rounded-lg bg-[#0E2559] border border-[#00F0FF]/40 shadow-2xl p-3 flex flex-col justify-between"
        >
          <div className="flex justify-between items-center text-[10px] text-cyan-300 font-mono">
            <span>SHEET 02 / FB1 POWER HARNESS</span>
            <span className="text-amber-400">30A FEED</span>
          </div>
          <div className="space-y-1.5 opacity-50">
            <div className="h-1.5 bg-[#00F0FF] rounded w-4/5" />
            <div className="h-1.5 bg-[#00F0FF] rounded w-2/3" />
            <div className="h-1.5 bg-[#00F0FF] rounded w-1/3" />
          </div>
          <div className="text-[9px] text-cyan-400/80 font-mono">IEC 61082-1 RASTER 150 DPI</div>
        </motion.div>

        {/* Layer 1: Front Active Document (Centered) */}
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#0B1F4B] to-[#071333] border-2 border-[#2F6BFF] shadow-[0_0_35px_rgba(47,107,255,0.35)] p-4 flex flex-col justify-between z-10"
        >
          <div className="flex items-center justify-between border-b border-blue-500/30 pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00F0FF]" />
              <span className="text-xs font-semibold text-white tracking-wide font-mono">
                VDH_MAIN_SCHEMATIC.PDF
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#16A34A]/20 text-[#16A34A] border border-[#16A34A]/40">
              SHA-256 OK
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2 text-[10px] font-mono">
            <div className="p-2 rounded bg-black/40 border border-blue-500/20">
              <span className="text-slate-400 block text-[9px]">TOTAL SHEETS</span>
              <span className="text-white font-bold text-sm">3 Pages</span>
            </div>
            <div className="p-2 rounded bg-black/40 border border-blue-500/20">
              <span className="text-slate-400 block text-[9px]">RASTER RESOLUTION</span>
              <span className="text-[#00F0FF] font-bold text-sm">1200 DPI</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-blue-500/20 text-[10px] text-slate-300 font-mono">
            <span className="flex items-center gap-1 text-[#2F6BFF]">
              <ShieldCheck className="w-3.5 h-3.5" /> Isolated Tenant Vault
            </span>
            <span className="text-emerald-400">Pre-Flight Passed</span>
          </div>
        </motion.div>
      </div>

      {/* Floating Corner Badges */}
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[#2F6BFF]/20 border border-[#2F6BFF]/50 text-[10px] font-mono text-blue-200">
        INPUT: MULTI-PAGE CAD
      </div>
    </div>
  );
}

/** Card 2: Glowing AI Core with Orbiting Standards Chips */
export function CardAiCoreVisual() {
  const standards = [
    { name: "IPC/WHMA-A-620D", pos: "top-2 left-4", color: "#00F0FF" },
    { name: "IPC-A-610 CLASS 3", pos: "top-2 right-4", color: "#2F6BFF" },
    { name: "UL 508A § 28.1", pos: "bottom-3 left-4", color: "#F59E0B" },
    { name: "SAE J1939 CAN", pos: "bottom-3 right-4", color: "#16A34A" },
  ];

  return (
    <div className="relative w-full h-[320px] sm:h-[360px] flex items-center justify-center overflow-hidden rounded-xl bg-[#071333]/70 border border-[#00F0FF]/30 p-4">
      {/* Background Radial Glow */}
      <div className="absolute w-[240px] h-[240px] rounded-full bg-[#00F0FF]/10 blur-3xl pointer-events-none" />

      {/* Orbit Track Rings */}
      <div className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-[#00F0FF]/25 animate-[spin_40s_linear_infinite]" />
      <div className="absolute w-[250px] h-[250px] rounded-full border border-[#2F6BFF]/20 animate-[spin_55s_linear_infinite_reverse]" />

      {/* Glowing AI Core Reactor */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              "0 0 25px rgba(0, 240, 255, 0.4)",
              "0 0 50px rgba(47, 107, 255, 0.6)",
              "0 0 25px rgba(0, 240, 255, 0.4)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0B1F4B] via-[#0E2559] to-[#00F0FF]/30 border-2 border-[#00F0FF] flex flex-col items-center justify-center text-center p-2"
        >
          <Cpu className="w-7 h-7 text-[#00F0FF] mb-1" />
          <span className="text-[10px] font-black text-white tracking-widest font-mono">
            QC CORE
          </span>
          <span className="text-[8px] text-[#00F0FF] font-mono">142 RULES</span>
        </motion.div>

        {/* Status Pill beneath core */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#00F0FF]/40 text-[10px] font-mono text-[#00F0FF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
          <span>ZERO HALLUCINATIONS • CODE JUDGES</span>
        </div>
      </div>

      {/* Floating Orbiting Standards Chips */}
      {standards.map((std, idx) => (
        <motion.div
          key={std.name}
          animate={{ y: [0, idx % 2 === 0 ? -6 : 6, 0] }}
          transition={{ duration: 3.5 + idx * 0.5, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute ${std.pos} px-2.5 py-1 rounded bg-[#0B1F4B]/90 border shadow-lg backdrop-blur text-[10px] font-mono font-semibold flex items-center gap-1.5`}
          style={{ borderColor: `${std.color}60`, color: std.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: std.color }} />
          <span>{std.name}</span>
        </motion.div>
      ))}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-slate-400 font-mono tracking-wider">
        SERVER-SIDE VALIDATED PROMPT (LOCKED V2)
      </div>
    </div>
  );
}

/** Card 3: Certified QC Report Output with Donut & Localized Flag Dots */
export function CardOutputVisual() {
  return (
    <div className="relative w-full h-[320px] sm:h-[360px] flex flex-col justify-between overflow-hidden rounded-xl bg-[#071333]/70 border border-[#16A34A]/30 p-4">
      {/* Top Bar: Verdict & Pass Donut */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#16A34A]/20 border border-[#16A34A]/50 flex items-center justify-center text-[#16A34A]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white font-mono tracking-wide">
              QC VERDICT: 94.2% PASS
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Ready for Reviewer Sign-Off
            </span>
          </div>
        </div>

        {/* Mini SVG Donut */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-800"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-[#16A34A]"
              strokeDasharray="94, 100"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-[9px] font-black text-emerald-400 font-mono">94%</span>
        </div>
      </div>

      {/* Flagged Discrepancy Items with Spatial Bounding */}
      <div className="space-y-1.5 my-2">
        <div className="p-2 rounded bg-[#DC2626]/10 border border-[#DC2626]/40 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-red-300">
            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
            <span>Pin 75/76 CAN Swap (CMCU Conn)</span>
          </div>
          <span className="text-red-400 font-bold px-1 rounded bg-red-950/50">CRITICAL</span>
        </div>

        <div className="p-2 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/40 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>16 AWG Conductor on 40A Breaker</span>
          </div>
          <span className="text-amber-400 font-bold px-1 rounded bg-amber-950/50">MISMATCH</span>
        </div>

        <div className="p-2 rounded bg-[#3B82F6]/10 border border-[#3B82F6]/40 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-blue-300">
            <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Creepage Clearance 1.82mm (&lt; 2.20mm)</span>
          </div>
          <span className="text-blue-400 font-bold px-1 rounded bg-blue-950/50">CLASS 3</span>
        </div>
      </div>

      {/* Export Action Bar */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-mono text-slate-200 transition-colors"
          >
            <Download className="w-3 h-3 text-[#2F6BFF]" />
            <span>PDF Certificate</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-mono text-slate-200 transition-colors"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            <span>5-Tab Excel (.xlsx)</span>
          </button>
        </div>
        <span className="text-[9px] text-slate-400 font-mono">ISO 9001 Signed</span>
      </div>
    </div>
  );
}

