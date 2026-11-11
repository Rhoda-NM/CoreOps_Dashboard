import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { legalRehearsalAvailable } from "@/server/legal/config";
import { presentSyntheticLegalSet } from "@/server/legal/acceptance";
import { acceptRehearsalLegalAction } from "./actions";
export const dynamic = "force-dynamic";
export default async function RehearsalLegalPage() {
  if (!legalRehearsalAvailable()) notFound();
  let presented;
  try { presented = await presentSyntheticLegalSet(); }
  catch (error) { unstable_rethrow(error); return <main><h1>Synthetic legal review unavailable</h1><p>No current reconstructable rehearsal set is available. No acceptance was recorded.</p><Link href="/account">Account</Link></main>; }
  return <main className="mx-auto max-w-3xl space-y-6 p-8"><h1>Synthetic legal-document rehearsal</h1><p role="note">Internal test only. These are synthetic fixtures, not legally approved customer documents, processing consent or a customer DPA.</p><p>Set {presented.version}</p><section><h2>Terms — {presented.termsVersion}</h2><pre className="whitespace-pre-wrap font-sans">{presented.termsText}</pre></section><section><h2>Privacy — {presented.privacyVersion}</h2><pre className="whitespace-pre-wrap font-sans">{presented.privacyText}</pre></section><form action={acceptRehearsalLegalAction} className="space-y-4"><input name="presentationId" type="hidden" value={presented.presentationId}/><input name="publicationId" type="hidden" value={presented.publicationId}/><input name="manifestHash" type="hidden" value={presented.manifestHash}/><label className="block"><input name="agreeTerms" type="checkbox" required/> I agree to these synthetic Terms.</label><label className="block"><input name="acknowledgePrivacy" type="checkbox" required/> I acknowledge this synthetic Privacy notice. This is not optional processing consent.</label><button>Record synthetic agreement and acknowledgment</button></form><Link href="/account">Account &amp; security</Link></main>;
}
