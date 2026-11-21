import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import Link from "@/components/workspaces/SiteLink";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { requireCentralHost } from "@/server/routing/request-context";
import { getAuthConfiguration } from "@/config/auth";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { acceptCurrentLegalAction } from "./actions";
export const dynamic = "force-dynamic";

export default async function LegalAcceptancePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  await requireCentralHost();
  const intent = safeAuthReturn((await searchParams).returnTo);
  await requireClerkIdentity();
  const config = getAuthConfiguration();
  return <div className="workspace-theme"><main className="private-account"><section className="private-account-card space-y-6"><p className="text-xs uppercase tracking-widest text-core-accent">WorkflowConnect legal documents</p><h1 className="text-2xl font-semibold">{config.legalReady ? "Review the current legal documents" : "Legal documents are still in draft"}</h1><p className="text-sm leading-6 text-core-text-secondary">{config.legalReady ? "Review these versions before continuing. This confirmation is separate from marketing communications." : "No mandatory acceptance is collected for unapproved documents. Final approval and effective dates are pending."}</p><ul className="space-y-3 text-sm"><li><Link href="/terms" className="text-core-accent underline">Terms of Service · {config.termsVersion}</Link></li><li><Link href="/privacy" className="text-core-accent underline">Privacy Policy · {config.privacyVersion}</Link></li></ul>{config.legalReady && <form action={acceptCurrentLegalAction.bind(null, config.termsVersion, config.privacyVersion, intent)} className="space-y-5"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="acceptLegal" required className="mt-1" /><span>I accept the Terms of Service ({config.termsVersion}) and acknowledge the Privacy Policy ({config.privacyVersion}).</span></label><PendingSubmitButton>Accept and continue</PendingSubmitButton></form>}<Link href="/account" className="inline-block text-sm text-core-accent">Account settings</Link></section></main></div>;
}
