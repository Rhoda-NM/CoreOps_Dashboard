"use client";
import { useNavigation } from "@/components/workspaces/NavigationProvider";
import { useState } from "react";
import { ArrowUpRight, Check, Users } from "lucide-react";

type Interval = "MONTHLY" | "ANNUAL";
export type PricingPlan = {
  id: string; name: string; description: string; members: string; features: string[]; note: string;
  prices: { interval: Interval; amount: string | null; currency: string; payable: string | null; taxTreatment: string | null }[];
};
const amount = (value: string, currency: string) => {
  const [whole, fraction] = value.split(".");
  return `${currency} ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${fraction && fraction !== "00" ? `.${fraction}` : ""}`;
};
export function PricingCards({ plans, accountHref, contactHref }: { plans: PricingPlan[]; accountHref: string; contactHref: string }) {
  const { site } = useNavigation();
  const [interval, setInterval] = useState<Interval>("MONTHLY");
  const twoMonthSaving = plans.filter(plan => plan.id !== "ENTERPRISE").every(plan => {
    const monthly = plan.prices.find(price => price.interval === "MONTHLY");
    const annual = plan.prices.find(price => price.interval === "ANNUAL");
    return monthly?.amount && annual?.amount && monthly.currency === annual.currency && Number(annual.amount) === Number(monthly.amount) * 10;
  });
  return <div>
    <div className="mb-12 flex flex-col items-center gap-4">
      <div role="group" aria-label="Billing interval" className="inline-flex rounded-full border border-brand-line bg-white p-1.5 shadow-sm">
        {([['MONTHLY', 'Monthly'], ['ANNUAL', 'Annual']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={interval === value} onClick={() => setInterval(value)} className={`min-h-12 rounded-full px-7 text-base font-semibold transition-colors ${interval === value ? "bg-brand-deep text-white" : "text-brand-muted hover:bg-brand-warm"}`}>{label}</button>)}
      </div>
      <p className="text-center text-base text-brand-muted">{interval === "ANNUAL" ? `One upfront payment for 12 months.${twoMonthSaving ? " Save the equivalent of two months." : ""}` : "A plan that fits your month."}</p>
    </div>
    <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {plans.map(plan => {
        const price = plan.prices.find(p => p.interval === interval)!;
        const featured = plan.id === "BUSINESS";
        const enterprise = plan.id === "ENTERPRISE";
        return <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-6 pt-8 lg:p-7 lg:pt-8 ${featured ? "border-brand-deep bg-brand-deep text-white shadow-xl shadow-brand-deep/10" : "border-brand-line bg-white"}`}>
          <p className={`mb-5 min-h-10 text-sm font-semibold uppercase tracking-widest ${featured ? "text-[#A5E3CE]" : "text-brand-muted"}`}>{featured ? "For growing teams" : enterprise ? "Made to fit" : plan.id === "SOLO" ? "For independent work" : "For small teams"}</p>
          <h2 className="text-3xl font-semibold tracking-tight">{plan.name}</h2>
          <p className={`mt-3 min-h-20 text-base leading-7 ${featured ? "text-[#C4D8CF]" : "text-brand-muted"}`}>{plan.description}</p>
          <div className="mt-6 min-h-28">
            <p className="text-[clamp(1.7rem,2.3vw,2rem)] font-semibold tracking-tight">{price.amount ? amount(price.amount,price.currency) : "Let’s talk"}</p>
            <p className={`mt-2 text-base ${featured ? "text-[#C4D8CF]" : "text-brand-muted"}`}>{price.amount ? (interval === "ANNUAL" ? "per year · billed annually" : "per month · billed monthly") : "A quotation for your business"}</p>
          </div>
          <a href={site(enterprise ? contactHref : accountHref)} className={`mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${featured ? "bg-[#BCEBDD] text-brand-deep hover:bg-white" : "border border-brand-line text-brand-deep hover:bg-[#EFF3EC]"}`}>{enterprise ? "Contact Sales" : `Choose ${plan.name}`}<ArrowUpRight aria-hidden="true" size={18}/></a>
          <div className={`mt-8 border-t pt-6 ${featured ? "border-white/20" : "border-brand-line"}`}>
            <p className="flex items-center gap-2 text-base font-semibold"><Users aria-hidden="true" size={18}/>{plan.members}</p>
            <ul className="mt-6 space-y-4">{plan.features.map(feature => <li key={feature} className={`flex items-start gap-3 text-base leading-6 ${featured ? "text-[#E0EEE8]" : "text-brand-muted"}`}><Check aria-hidden="true" size={18} className="mt-0.5 shrink-0"/>{feature}</li>)}</ul>
          </div>
          <div className="mt-auto pt-8"><p className={`text-sm leading-6 ${featured ? "text-[#C4D8CF]" : "text-brand-muted"}`}>{plan.note}</p>{price.payable && <p className={`mt-3 text-sm leading-6 ${featured ? "text-[#C4D8CF]" : "text-brand-muted"}`}>{price.taxTreatment === "EXCLUSIVE" ? "Base amount; tax follows your quotation." : price.taxTreatment === "INCLUSIVE" ? "Tax-inclusive amount." : price.taxTreatment === "NON_VAT_REGISTERED" ? "Supplier is not VAT registered; no VAT charged." : "Exempt quotation."} Payable: {amount(price.payable,price.currency)}.</p>}</div>
        </article>;
      })}
    </div>
    <p className="mx-auto mt-8 max-w-3xl text-center text-base leading-7 text-brand-muted">Prices in Kenyan shillings. Your quotation confirms the final payable amount and any applicable tax. Paid access starts after payment verification and activation.</p>
  </div>;
}
