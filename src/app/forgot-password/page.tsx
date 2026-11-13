"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { SpanqcLogo } from "@/components/brand/SpanqcLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-center items-center p-4 bg-cosmic-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-5 hover:opacity-90 transition-opacity">
            <SpanqcLogo variant="full" size="lg" priority />
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your work email to receive password reset instructions.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-[#0c101a] border border-[#1b253b] shadow-2xl shadow-black/80">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">Reset Link Dispatched</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If an account exists for <span className="text-slate-200 font-mono">{email}</span>,
                you will receive a link shortly.
              </p>
              <Link href="/login" className="inline-block mt-4">
                <Button variant="outline" size="sm">
                  Return to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Work Email"
                type="email"
                required
                leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
              <Button type="submit" variant="primary" size="md" className="w-full">
                Send Reset Link
              </Button>
              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to login</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Encrypted with TLS 1.3 & AES-256 • Tenant Partitioned</span>
        </div>
      </div>
    </div>
  );
}
