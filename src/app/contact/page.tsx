"use client";

import React, { useState } from "react";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Mail, Phone, MapPin, CheckCircle2, Send, Building, Sparkles } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>DIRECT ENGINEERING CHANNEL</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Contact SpanQC Engineering
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discuss custom rule codification, enterprise integrations, or schedule a technical deep-dive
            with our lead QC engineers.
          </p>
        </div>
      </section>

      {/* Content Form & Info */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Contact Details */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                Engineering Headquarters
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Spandsons Horizon Engineering Pvt. Ltd. operates dedicated research and quality automation
                facilities supporting aerospace and automotive wire harness manufacturers.
              </p>
            </div>

            <div className="space-y-4 text-xs pt-4 border-t border-[#1b253b]">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Spandsons Horizon Engineering Pvt. Ltd.
                  <br />Bangalore & Chennai Engineering Hubs, India
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300 font-mono">engineering@spandsons.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300">Technical Stakeholder: Pravin (Lead QC Inspector)</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c101a] border border-[#1b253b] text-xs text-slate-400 shadow-lg">
              <p className="font-semibold text-white mb-1">Looking for a pilot trial?</p>
              <p className="leading-relaxed">You can instantly test the system using our preloaded industrial avionics and MCC schematics without scheduling a call.</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-7">
            <div className="p-8 rounded-3xl bg-[#0c101a] border border-[#1b253b] shadow-2xl shadow-black/50">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white tracking-tight">Inquiry Received</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Thank you. Our engineering team will review your specifications and contact you within one business day.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4 tracking-tight">Send a Technical Inquiry</h3>

                  <Input
                    label="Full Name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Pravin Sundaram"
                  />

                  <Input
                    label="Engineering Email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@company.com"
                  />

                  <Input
                    label="Organization / Company"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Defense Avionics Corp"
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Technical Requirements / Scope
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Specify schematic standards (IPC-620 Class 3, UL 508A), monthly drawing volume, or CAD formats..."
                      className="w-full bg-[#070b14] text-slate-100 placeholder:text-slate-500 border border-[#1b253b] rounded-xl text-sm p-3.5 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 transition-all"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full mt-2"
                    rightIcon={<Send className="w-4 h-4" />}
                  >
                    Submit Technical Inquiry
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
