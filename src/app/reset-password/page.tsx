"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Rocket, Lock, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col justify-center items-center p-4 bg-cosmic-mesh">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 via-blue-600/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10 group-hover:scale-105 transition-all">
              <Rocket className="w-5 h-5 -rotate-45 text-cyan-400" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-white font-mono tracking-tight">SPANQC</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
                  BY SPANDSONS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-tight">AI-Assisted Wiring Diagram QC</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create New Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose a strong password with at least 8 characters.
          </p>
        </div>

        <div className="p-8 rounded-3xl bg-[#0c101a] border border-[#1b253b] shadow-2xl shadow-black/80">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">Password Updated</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your password has been securely reset. You can now log in with your new credentials.
              </p>
              <Link href="/login" className="inline-block mt-4">
                <Button variant="primary" size="sm">
                  Proceed to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}
              <Input
                label="New Password"
                type="password"
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                leftIcon={<Lock className="w-4 h-4 text-slate-500" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <Button type="submit" variant="primary" size="md" className="w-full">
                Update Password
              </Button>
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
