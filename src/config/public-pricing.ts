// Founder instruction of 12 November 2026. Commercial pricing approval only:
// not tax registration, legal approval, merchant verification or release approval.
export const pricingApproval = {
  release: "WORKFLOWCONNECT-INITIAL-2026-11-12",
  reference: "FOUNDER-2026-11-12-FINAL-PRICING-DECISION",
  currency: "KES",
} as const;
export const publicPricing = {
  SOLO: { MONTHLY: "100.00", ANNUAL: "1000.00" },
  STARTER: { MONTHLY: "300.00", ANNUAL: "3000.00" },
  BUSINESS: { MONTHLY: "1000.00", ANNUAL: "10000.00" },
} as const;
// Setup, brochure fallback and tests consume this one approved release.
export const approvedCatalog = (["SOLO", "STARTER", "BUSINESS", "ENTERPRISE"] as const).flatMap(plan =>
  (["MONTHLY", "ANNUAL"] as const).map(interval => ({
    plan, interval, name: plan.charAt(0) + plan.slice(1).toLowerCase(),
    amount: plan === "ENTERPRISE" ? null : publicPricing[plan][interval],
    currency: pricingApproval.currency,
    memberLimit: plan === "SOLO" ? 1 : plan === "STARTER" ? 3 : plan === "BUSINESS" ? 10 : null,
    projectLimit: null,
    invitationsEnabled: plan !== "SOLO",
    features: { clients: true, projects: true, tasks: true, invoices: true, dashboard: true },
    commercialPath: plan === "ENTERPRISE" ? "MANUAL" : "STANDARD",
  })),
);
