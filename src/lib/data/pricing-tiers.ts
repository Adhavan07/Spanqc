/**
 * Authoritative Pricing Tiers for SpanQC
 * Validated commercial tiers per Build-to-Demo Specification:
 * - Starter: ₹9,999 / month (Annual: ₹7,999 / month)
 * - Production: ₹24,999 / month (Annual: ₹19,999 / month)
 * - Enterprise: ₹75,000+ / month (Custom annual agreement)
 */

export interface PricingTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPriceINR: number;
  annualPriceINR: number; // Monthly equivalent when billed annually
  annualDiscountPct: number;
  checksIncluded: number;
  overageRateINR: number;
  isPopular?: boolean;
  targetAudience: string;
  features: string[];
  ctaText: string;
  ctaHref: string;
}

export const VALIDATED_PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter Engineering",
    tagline: "For small design teams & prototyping consultants",
    monthlyPriceINR: 9999,
    annualPriceINR: 7999,
    annualDiscountPct: 20,
    checksIncluded: 35,
    overageRateINR: 280,
    targetAudience: "Small engineering consultancies and low-volume prototyping teams.",
    features: [
      "35 diagram checks included monthly",
      "Full IPC/WHMA-A-620 rules verification",
      "Interactive discrepancy split-screen viewer",
      "Sub-millimeter coordinate bounding overlays",
      "Standard PDF & Excel (.xlsx) QC reports",
      "Email engineering support (24h SLA)",
      "₹280 / additional check overage",
    ],
    ctaText: "Start Starter Plan",
    ctaHref: "/login",
  },
  {
    id: "production",
    name: "Production Line",
    tagline: "For EMS manufacturers & wire harness production lines",
    monthlyPriceINR: 24999,
    annualPriceINR: 19999,
    annualDiscountPct: 20,
    checksIncluded: 120,
    overageRateINR: 200,
    isPopular: true,
    targetAudience: "EMS manufacturers, harness builders, and industrial control panel facilities.",
    features: [
      "120 diagram checks included monthly",
      "Complete IPC-620 + UL 508A rule packages",
      "Coordinate bounding box evidence overlay",
      "Human sign-off & reviewer audit trails",
      "Multi-sheet Excel & PDF QC reports with hash verification",
      "Multi-seat team workspace (Admin, Engineer, Reviewer)",
      "Priority engineering support (4-hour SLA)",
      "₹200 / additional check overage",
    ],
    ctaText: "Start Production Plan",
    ctaHref: "/login",
  },
  {
    id: "enterprise",
    name: "Enterprise Multi-Plant",
    tagline: "For aerospace contractors, automotive OEMs & defense orgs",
    monthlyPriceINR: 75000,
    annualPriceINR: 65000,
    annualDiscountPct: 15,
    checksIncluded: 500,
    overageRateINR: 150,
    targetAudience: "Multi-facility manufacturers requiring custom SOPs and dedicated deployment.",
    features: [
      "500+ diagram checks (custom volume quota)",
      "Custom proprietary SOP & manufacturing rule digitization",
      "Dedicated AWS VPC or On-Premise container deployment",
      "Zero model training on customer drawings",
      "Role-Based Access Control (Admin, Engineer, Reviewer)",
      "Dedicated Technical Account Manager & custom SLA",
      "Custom ERP/PLM webhooks & automated ingestion",
    ],
    ctaText: "Contact Engineering",
    ctaHref: "/contact",
  },
];

export const POSITIONING_STATEMENT =
  "AI-assisted quality checking that helps engineering teams review wiring diagrams more efficiently — while keeping engineers in control.";
