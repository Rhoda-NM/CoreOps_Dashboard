import { PageHeader } from "@/components/platform/PlatformUI";
import { notFound } from "next/navigation";
import { marketRehearsalAvailable } from "@/server/market/config";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { requirePlatform } from "@/server/commercial/platform-auth";
import { requireMarketRehearsal } from "@/server/market/config";
import { marketReviewAction } from "./actions";
import { requirePay1Admission } from "@/server/preview/pay1-admission";
import { pay1Enabled } from "@/server/preview/pay1-config";
export const dynamic = "force-dynamic";
export default async function MarketReviewPage() {
  if (!marketRehearsalAvailable()) notFound();
 requireMarketRehearsal(); await requirePlatform("activate");
 const admission = pay1Enabled() ? await requirePay1Admission() : null;
 const rows = await prisma.marketApplication.findMany({ where: admission ? { pay1AdmissionId: admission.id } : {}, orderBy: { createdAt: "desc" }, take: 50, include: { submissions: { orderBy: { revision: "desc" }, take: 1 } } });
 return <section className="space-y-6"><PageHeader title="Market review" description="Review business eligibility independently of identity, payment verification and subscription activation."/><p>Manual approval validity and production transition policy are unapproved. Manual approval is unavailable in PAY-1. Use synthetic review dates only in local rehearsals. Review does not activate or verify payment.</p>{rows.map(row => <article key={row.id}><h2>{row.id} · {row.state}</h2><p>{row.state === "APPROVED" ? "Eligibility recorded; an approval deadline still applies where specified. " : ""}{row.submissions[0]?.country} (self-declared) · {row.submissions[0]?.useCase}</p><form action={marketReviewAction}><input name="id" type="hidden" value={row.id}/><input name="revision" type="hidden" value={row.revision}/><input name="key" type="hidden" value={randomUUID()}/><label>Decision<select name="type">{!admission && <option value="APPROVE">Approve</option>}<option value="DEFER">Defer</option><option value="REJECT">Reject</option><option value="REVOKE">Revoke</option></select></label><label>Reason / protected evidence reference<input name="reason" required minLength={3} maxLength={1000}/></label><label>Synthetic approval deadline (ISO UTC)<input name="validUntil"/></label><button>Record reviewed decision</button></form></article>)}</section>;
}
