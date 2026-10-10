"use client";

import React from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ShieldCheck,
  Lock,
  Database,
  KeyRound,
  FileCheck2,
  Server,
  UserCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function SecurityPage() {
  const securityPillars = [
    {
      title: "Tenant Cryptographic Isolation",
      desc: "Every organization is logically and cryptographically partitioned. Engineering documents, findings, and metadata are indexed strictly by organization ID with database row-level enforcement.",
      icon: Database,
    },
    {
      title: "Encryption in Transit & at Rest",
      desc: "All client traffic requires TLS 1.3. Uploaded schematic manuals and generated reports stored in AWS S3 utilize server-side AES-256 encryption (SSE-S3) with strict bucket policies.",
      icon: Lock,
    },
    {
      title: "Role-Based Access Control (RBAC)",
      desc: "Built-in roles (Admin, Engineer, Reviewer) control drawing uploads, finding confirmations, and report exports. Backend permission gates ensure unauthorized members cannot approve inspections.",
      icon: UserCheck,
    },
    {
      title: "Audit Logging & Non-Repudiation",
      desc: "Every critical lifecycle action—upload, processing trigger, inspector confirmation, reject rationale, and report export—is recorded with timestamp, user ID, and IP address.",
      icon: FileCheck2,
    },
    {
      title: "Presigned Ephemeral Access",
      desc: "Schematic binaries are never served via public URLs. Time-limited AWS S3 presigned URLs (15-minute expiration) provide authorized direct streaming.",
      icon: KeyRound,
    },
    {
      title: "Isolated Processing Pipeline",
      desc: "Document parsing, OCR, and deterministic rule evaluation execute in ephemeral container tasks with no external telemetry or unauthorized data exfiltration.",
      icon: Server,
    },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>SECURITY & COMPLIANCE POSTURE</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Engineering Security Architecture
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Wiring diagrams contain sensitive intellectual property. We protect your schematics with strict tenant isolation,
            cryptographic encryption, and verifiable audit logging.
          </p>
          <div className="mt-4 max-w-xl mx-auto px-4 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            “AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.”
          </div>
        </div>
      </section>

      {/* Security Pillars Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-2xl bg-[#0c101a] border border-[#1b253b] hover:border-cyan-500/40 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2 tracking-tight">{pillar.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{pillar.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Model Privacy Notice */}
          <div className="mt-16 p-8 rounded-3xl bg-[#0c101a] border border-cyan-500/30 shadow-xl shadow-cyan-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">Zero-Data Retention for Model Training</h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  Your proprietary schematics, harness netlists, and engineering sign-offs are strictly private.
                  SpanQC never trains public or external foundational AI models on customer drawings, documents, or validation findings.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <Link href="/login">
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Access Workspace
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button variant="outline" size="sm">
                      Request SOC 2 Documentation
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
