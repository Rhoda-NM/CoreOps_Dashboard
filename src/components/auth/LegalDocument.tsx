import Link from "@/components/workspaces/SiteLink";
import type { ReactNode } from "react";
import { getAuthConfiguration } from "@/config/auth";
export function LegalDocument({ title, kind, children, documentMetadata }: { title: string; kind: "terms" | "privacy"; children: ReactNode; documentMetadata?: { version: string; preparedAt: string; effectiveDate: string } }) {
  const config = getAuthConfiguration();
  const version = kind === "terms" ? config.termsVersion : config.privacyVersion;
  const effectiveAt = kind === "terms" ? config.termsEffectiveAt : config.privacyEffectiveAt;
  return <main className="mx-auto max-w-3xl space-y-7 px-5 py-12 text-core-text"><Link href="/" className="text-sm font-semibold text-core-accent">WorkflowConnect</Link><header className="space-y-3"><h1 className="text-3xl font-semibold">{title}</h1><p className="text-sm text-core-text-secondary">{config.serviceProvider} · Version {documentMetadata?.version ?? version}</p><p className="text-sm text-core-text-secondary">Effective date: {documentMetadata?.effectiveDate ?? (effectiveAt ? new Date(effectiveAt).toLocaleDateString("en-GB", { timeZone: "UTC" }) : "Pending finalization")}</p>{documentMetadata && <p className="text-sm text-core-text-secondary">Prepared: {documentMetadata.preparedAt} · Draft for Legal Review</p>}</header>
    {(documentMetadata || !config.legalReady) && <aside role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-200"><strong>Draft — not legally approved.</strong> These provisional documents are for review. Approval, complete contractual terms, and effective dates must be finalized before production launch. They are not currently presented for mandatory acceptance.</aside>}
    <article className="space-y-7 text-sm leading-7 text-core-text-secondary [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-core-text [&_a]:text-core-accent [&_a]:underline">{children}</article>
    <footer className="flex flex-wrap gap-5 border-t border-core-border pt-5 text-sm"><Link href="/terms" className="text-core-accent">Terms of Service</Link><Link href="/privacy" className="text-core-accent">Privacy Policy</Link><Link href="/sign-up" className="text-core-accent">Registration</Link></footer>
  </main>;
}
