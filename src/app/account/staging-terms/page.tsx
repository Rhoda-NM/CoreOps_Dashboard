import { requireCentralHost } from "@/server/routing/request-context";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { requireStagingEnvironment } from "@/server/staging/environment";
import { stagingNotice } from "@/server/staging/acknowledgment";
import { acceptStagingNotice } from "./actions";
export const dynamic = "force-dynamic";
export default async function StagingTerms() {
  await requireCentralHost(); await requireClerkIdentity(); await requireStagingEnvironment();
  return <main className="mx-auto max-w-2xl space-y-6 px-6 py-16 text-core-text"><h1 className="text-3xl font-semibold">Before you begin testing</h1><p className="whitespace-pre-line leading-relaxed">{stagingNotice}</p><form action={acceptStagingNotice} className="space-y-6"><label className="flex items-start gap-3"><input name="accepted" type="checkbox" required/><span>I agree to use this environment for synthetic testing only.</span></label><button className="rounded-xl bg-core-primary px-5 py-3">Agree and continue</button></form></main>;
}
