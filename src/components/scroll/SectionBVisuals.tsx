"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  ShieldAlert,
  UploadCloud,
  FileCode2,
  AlertCircle,
  FileSpreadsheet,
  History,
  CreditCard,
  Lock,
  CheckCircle2,
  Layers,
  ArrowDown,
  Terminal,
} from "lucide-react";

interface MicroVisualProps {
  type: string;
}

export function WorkflowMicroVisual({ type }: MicroVisualProps) {
  switch (type) {
    case "auth_token":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#2F6BFF]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-blue-300">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>JWT SESSION TOKEN</span>
            </span>
            <span className="text-emerald-400 font-bold">256-BIT AES OK</span>
          </div>
          <div className="p-2 rounded bg-[#071333] border border-blue-500/20 text-[10px] text-slate-300 truncate">
            eyJh...w5h.eyJzdWIiOiJ1c3JfMGExMmJjOCIsInRlbmFudElkIjoidG50X2Flc192ZGgifQ.K7x
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Role: Lead QC Engineer</span>
            <span className="text-[#00F0FF]">Tenant Isolation Active</span>
          </div>
        </div>
      );

    case "upload_progress":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#2F6BFF]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-blue-300">
            <span className="flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-[#2F6BFF]" />
              <span>MAGIC-BYTE & PRE-FLIGHT</span>
            </span>
            <span className="text-emerald-400 font-bold">100% COMPLETE</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "20%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="bg-gradient-to-r from-[#2F6BFF] to-[#00F0FF] h-full rounded-full"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>SHA-256: 8e4f9b2a3c1047fa9c1fa...</span>
            <span className="text-emerald-400">Validated %PDF</span>
          </div>
        </div>
      );

    case "locked_prompt":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#F59E0B]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-amber-300">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>SERVER PROMPT VAULT</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
              ZERO LEAKAGE
            </span>
          </div>
          <div className="p-2 rounded bg-[#071333] border border-amber-500/20 text-[10px] text-amber-200/80 flex items-center justify-between">
            <span className="truncate">Encrypted: extract_v2_deterministic.lock</span>
            <Lock className="w-3 h-3 text-[#F59E0B] flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Customer View: HIDDEN</span>
            <span className="text-amber-400">Fail-Closed Invariant</span>
          </div>
        </div>
      );

    case "structured_json":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#00F0FF]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-cyan-300">
            <span className="flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>NETLIST TOPOLOGY GRAPH</span>
            </span>
            <span className="text-cyan-400 text-[10px]">142 EDGES MAPPED</span>
          </div>
          <div className="p-2 rounded bg-[#071333] border border-cyan-500/20 text-[9px] text-cyan-200/90 leading-tight">
            <div>&#123;&quot;net&quot;: &quot;CAN_H&quot;, &quot;pin_src&quot;: &quot;CMCU:75&quot;, &quot;pin_dst&quot;: &quot;TB01:4&quot;&#125;</div>
            <div>&#123;&quot;net&quot;: &quot;FB1_30A&quot;, &quot;wire&quot;: &quot;10 AWG RED&quot;, &quot;fuse&quot;: &quot;F12&quot;&#125;</div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Graph Format: JSON-LD Netlist</span>
            <span className="text-emerald-400">IEC 81346 Compliant</span>
          </div>
        </div>
      );

    case "qc_report":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#DC2626]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-red-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
              <span>ON-SCREEN SPATIAL OVERLAY</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[9px] font-bold">
              DEFECT BOUNDING
            </span>
          </div>
          <div className="p-2 rounded bg-[#DC2626]/10 border border-[#DC2626]/40 text-[10px] text-red-200 flex items-center justify-between">
            <span>Pin 75/76 CAN Swap Box (X:524, Y:310)</span>
            <span className="text-[#DC2626] font-bold">FAIL</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Coordinate Precision: ±0.15mm</span>
            <span className="text-red-400">1 Critical Flag</span>
          </div>
        </div>
      );

    case "download_export":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#16A34A]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-emerald-300">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>AUDIT EXPORT PACKAGE</span>
            </span>
            <span className="text-emerald-400 font-bold">READY</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded bg-[#071333] border border-emerald-500/30 flex items-center justify-between">
              <span>PDF Audit Sign-Off</span>
              <ArrowDown className="w-3 h-3 text-[#16A34A]" />
            </div>
            <div className="p-2 rounded bg-[#071333] border border-emerald-500/30 flex items-center justify-between">
              <span>5-Tab .xlsx Sheet</span>
              <ArrowDown className="w-3 h-3 text-[#16A34A]" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>13-Column Verified Schema</span>
            <span className="text-emerald-400">ISO 9001 Signed</span>
          </div>
        </div>
      );

    case "audit_history":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#2F6BFF]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-blue-300">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>IMMUTABLE RUN AUDIT TRAIL</span>
            </span>
            <span className="text-[#00F0FF] text-[10px]">RUN #1042</span>
          </div>
          <div className="p-2 rounded bg-[#071333] border border-blue-500/20 text-[10px] text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span>Rev B vs Rev A Delta</span>
              <span className="text-emerald-400">+2 Resolved</span>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Archived in Tenant Vault</span>
              <span>Nov 05, 2026</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Tamper-Sealed Invariant</span>
            <span className="text-[#2F6BFF]">Retrievable 7 Yrs</span>
          </div>
        </div>
      );

    case "billing_meter":
      return (
        <div className="w-full h-36 rounded-xl bg-black/40 border border-[#16A34A]/30 p-3.5 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between text-[11px] text-emerald-300">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>ATOMIC USAGE LEDGER</span>
            </span>
            <span className="text-emerald-400 font-bold">1 CHECK USED</span>
          </div>
          <div className="p-2 rounded bg-[#071333] border border-emerald-500/20 flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Tenant Remaining Checks:</span>
            <span className="text-white font-bold text-sm">119 / 120</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Atomic Reservation Lock</span>
            <span className="text-emerald-400">Auto-Refund on Error</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

