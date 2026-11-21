import Link from "@/components/workspaces/SiteLink";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { requireCentralHost } from "@/server/routing/request-context";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { requireStagingEnvironment } from "@/server/staging/environment";
import { stagingNotice } from "@/server/staging/acknowledgment";
import { acceptStagingNotice } from "./actions";
export const dynamic = "force-dynamic";
export default async function StagingTerms({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const intent = safeAuthReturn((await searchParams).returnTo);
  await requireCentralHost(); await requireClerkIdentity(); await requireStagingEnvironment();
  return <div className="workspace-theme"><main className="private-account"><section className="private-account-card space-y-6"><h1 className="text-3xl font-semibold">Before you begin testing</h1><p className="whitespace-pre-line leading-relaxed">{stagingNotice}</p><form action={acceptStagingNotice.bind(null, intent)} className="space-y-6"><label className="flex items-start gap-3"><input name="accepted" type="checkbox" required/><span>I agree to use this environment for synthetic testing only.</span></label><PendingSubmitButton>Agree and continue</PendingSubmitButton></form><Link href="/auth-help" className="inline-flex min-h-11 items-center text-sm text-core-accent underline">Account help</Link></section></main></div>;
}
