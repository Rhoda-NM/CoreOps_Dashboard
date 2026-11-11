import { notFound } from "next/navigation";
import { marketRehearsalAvailable } from "@/server/market/config";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { countryCodes, ownMarketApplications } from "@/server/market/service";
import { marketApplicantAction } from "./actions";
import { createWorkspaceAction } from "@/features/workspaces/actions/create-workspace";
export const dynamic = "force-dynamic";
export default async function MarketPage() {
  if (!marketRehearsalAvailable()) notFound();
  const rows = await ownMarketApplications();
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return <main className="mx-auto max-w-3xl space-y-6 p-8"><h1>Business market inquiries</h1><Link href="/account">Account &amp; security</Link><p>Country is self-declared. Inquiry receipt and market eligibility do not verify payment or activate service. Changes to a provisioned business require separate review.</p>
    <form action={marketApplicantAction} className="space-y-3"><input type="hidden" name="key" value={randomUUID()}/><label className="block">Business country<select name="country" required defaultValue=""><option value="" disabled>Select country</option>{countryCodes.map(code => <option key={code} value={code}>{names.of(code)}</option>)}</select></label><label className="block">Interest<select name="interest"><option value="WORKFLOW">Workflow</option><option value="PROJECTS">Projects</option><option value="INVOICING">Invoicing</option></select></label><label className="block">Use case<textarea name="useCase" required minLength={3} maxLength={1000}/></label><p>No sensitive client information or credentials.</p><label><input name="attested" type="checkbox" required/> I have authority and declare the business country accurately.</label><button>Submit inquiry</button></form>
    {rows.map(row => <article className="space-y-2 border p-4" key={row.id}><h2>Case {row.id}</h2><p>{row.effectiveState} · {row.submissions[0]?.country} · self-declared · policy {row.submissions[0]?.policyId}</p>{row.decisions[0]?.validUntil && <p>Approval deadline: {row.decisions[0].validUntil.toISOString()}. Expired approvals cannot be used.</p>}{row.workspace ? <Link href={`/w/${row.workspace.slug}/subscription`}>Subscription status</Link> : <><form action={marketApplicantAction}><input type="hidden" name="operation" value="withdraw"/><input type="hidden" name="id" value={row.id}/><input type="hidden" name="revision" value={row.revision}/><input type="hidden" name="key" value={randomUUID()}/><button>Withdraw</button></form>{row.effectiveState === "APPROVED" && <form action={async (data: FormData) => { "use server"; const result = await createWorkspaceAction({ error: "" }, data); if (result.error) throw new Error("Workspace provisioning unavailable. Check eligibility and account status."); }}><input type="hidden" name="applicationId" value={row.id}/><label>Business name<input name="name" required minLength={2} maxLength={120}/></label><label>Workspace address<input name="slug" required minLength={3} maxLength={63}/></label><button>Create restricted workspace</button></form>}</>}</article>)}
  </main>;
}
