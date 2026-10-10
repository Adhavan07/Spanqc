"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Accordion } from "@/components/ui/Accordion";
import { Check, HelpCircle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { VALIDATED_PRICING_TIERS, POSITIONING_STATEMENT } from "@/lib/data/pricing-tiers";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const faqItems = [
    {
      id: "faq-1",
      title: "What constitutes a schematic diagram check?",
      content:
        "One check corresponds to a complete automated QC run on an uploaded schematic drawing document. Re-viewing past reports or re-downloading reports does not consume check credits.",
    },
    {
      id: "faq-2",
      title: "What happens when monthly quota is exceeded?",
      content:
        "You will receive warning banners as you approach your quota limit. You can purchase additional checks or enable flexible overage billing (₹200 - ₹280 / check) without service interruption.",
    },
    {
      id: "faq-3",
      title: "Are customer wiring diagrams used to train models?",
      content:
        "Strictly no. Customer drawings are processed in ephemeral containers, encrypted in transit and at rest, and are never used to train public or proprietary models.",
    },
    {
      id: "faq-4",
      title: "Can we digitize custom proprietary internal engineering SOPs?",
      content:
        "Yes, our Enterprise Tier includes custom rule pack ingestion to codify your proprietary design rules alongside IPC and UL standards.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-100 flex flex-col bg-cosmic-mesh">
      <MarketingNav />

      {/* Header */}
      <section className="pt-20 pb-20 border-b border-[#1b253b] bg-spaceship-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>COMMERCIAL ENGINEERING TIERS</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
            Transparent, Predictable Pricing
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {POSITIONING_STATEMENT}
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-[#0c101a] border border-[#1b253b]">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === "monthly"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                billingCycle === "annual"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards (Validated Tiers: ₹9,999 / ₹24,999 / ₹75,000+) */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALIDATED_PRICING_TIERS.map((tier) => {
            const isAnnual = billingCycle === "annual";
            const price = isAnnual ? tier.annualPriceINR : tier.monthlyPriceINR;
            const isEnterprise = tier.id === "enterprise";

            return (
              <div
                key={tier.id}
                className={`p-8 rounded-3xl flex flex-col justify-between relative transition-all duration-200 ${
                  tier.isPopular
                    ? "border-2 border-cyan-400 bg-[#0e1628] shadow-2xl shadow-cyan-500/15"
                    : "border border-[#1b253b] bg-[#0c101a] hover:border-slate-600"
                }`}
              >
                {tier.isPopular && (
                  <div className="absolute -top-3.5 right-6 px-3.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-mono font-extrabold uppercase tracking-wider shadow-md shadow-cyan-500/30">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <div
                    className={`text-xs font-mono font-bold uppercase tracking-wider ${
                      tier.isPopular ? "text-cyan-400" : "text-slate-400"
                    }`}
                  >
                    {tier.name}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1 font-mono">
                    {isEnterprise ? (
                      <span className="text-4xl font-extrabold text-white">₹75,000+</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-white">
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </>
                    )}
                  </div>
                  {isAnnual && !isEnterprise && (
                    <div className="text-[11px] text-emerald-400 font-mono mt-1">
                      Billed annually (Save 20%)
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {tier.tagline}
                  </p>

                  <div className="mt-6 pt-6 border-t border-[#1b253b] space-y-3 text-xs text-slate-300">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <Link href={tier.ctaHref}>
                    <Button
                      variant={tier.isPopular ? "primary" : "outline"}
                      size="md"
                      className="w-full cursor-pointer"
                    >
                      {tier.ctaText}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Security Box */}
        <div className="max-w-4xl mx-auto px-4 mt-16">
          <div className="p-7 rounded-2xl bg-[#0c101a] border border-cyan-500/30 flex items-center justify-between gap-6 flex-col sm:flex-row shadow-xl shadow-cyan-500/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Need a Dedicated VPC or On-Premise Deployment?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  For defense and aerospace organizations requiring air-gapped private cloud deployments and proprietary SOP digitization.
                </p>
              </div>
            </div>
            <Link href="/contact" className="shrink-0">
              <Button variant="secondary" size="sm">
                Talk to Engineering →
              </Button>
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto px-4 mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8 tracking-tight">
            Frequently Asked Billing & QC Questions
          </h2>
          <Accordion items={faqItems} />
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
