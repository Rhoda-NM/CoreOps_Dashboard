import { calculateTax } from "@/server/commercial/tax";
import type { marketingContent } from "@/server/commercial/marketing";
import { getAuthConfiguration } from "@/config/auth";
import { publicPricing } from "@/config/public-pricing";
import { PricingCards, type PricingPlan } from "./PricingCards";

type Content = Awaited<ReturnType<typeof marketingContent>>;
const plans = [
  { id: "SOLO", name: "Solo", description: "A focused home for your independent business.", members: "1 member · just you", features: ["Client management", "Projects and tasks", "Invoicing records", "Business dashboard"], note: "Built for one owner. No team invitations." },
  { id: "STARTER", name: "Starter", description: "Bring your small team into the same picture.", members: "Up to 3 members", features: ["Client, project and task management", "Invoicing records and dashboard", "Team invitations", "Roles and work assignments"], note: "The owner is included in your 3 seats." },
  { id: "BUSINESS", name: "Business", description: "More room for a growing service business.", members: "Up to 10 members", features: ["Client, project and task management", "Invoicing records and dashboard", "Team invitations", "Roles and work assignments"], note: "The owner is included in your 10 seats." },
  { id: "ENTERPRISE", name: "Enterprise", description: "An agreement shaped around your business.", members: "Contract-defined members", features: ["Agreed member allowance", "Agreed project limits", "Contract-defined feature access", "Tailored commercial quotation"], note: "Member allowances and scope agreed with you." },
] as const;
export function Pricing({ content }: { content: Content }) {
  const support = getAuthConfiguration().supportEmail;
  const cards: PricingPlan[] = plans.map(plan => ({
    ...plan,
    features: [...plan.features],
    prices: (["MONTHLY", "ANNUAL"] as const).map(interval => {
      const offer = content.offers.filter(o => o.pricingRelease && o.plan === plan.id && o.interval === interval).sort((a,b) => b.version - a.version)[0];
      if (offer) return { interval, amount: offer.amount?.toFixed(2) ?? null, currency: offer.currency, payable: offer.amount ? calculateTax(offer.amount, offer.taxTreatment, content.tax).payable.toFixed(2) : null, taxTreatment: offer.taxTreatment };
      return { interval, amount: plan.id === "ENTERPRISE" ? null : publicPricing[plan.id][interval], currency: "KES", payable: null, taxTreatment: null };
    }),
  }));
  return <PricingCards plans={cards} accountHref={content.ctaHref} contactHref={support ? `mailto:${support}?subject=WorkflowConnect%20Enterprise` : "/auth-help"}/>;
}
