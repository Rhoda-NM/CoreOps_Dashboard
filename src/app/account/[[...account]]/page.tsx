import Link from "@/components/workspaces/SiteLink";
import { marketRehearsalAvailable } from "@/server/market/config";
import { dataAccessEnabled } from "@/server/data-access/security";
import { requireCentralHost } from "@/server/routing/request-context";
import { UserProfile } from "@clerk/nextjs";
import { LockKeyhole, ArrowLeft, ShieldCheck } from "lucide-react";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { readClerkConfiguration } from "@/server/auth/clerk-configuration";
import { LegalLinks } from "@/components/auth/LegalLinks";
import { getAuthConfiguration } from "@/config/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  // This route can help verify an email even when WorkflowConnect provisioning is blocked.
  await requireCentralHost();
  const profile = await requireClerkIdentity({ allowUnverifiedEmail: true });
  const remote = await readClerkConfiguration();
  const safeManagement = remote?.user_settings?.actions?.delete_self === false && profile.deleteSelfEnabled === false;
  const { supportEmail, legalReady } = getAuthConfiguration();
  return <main className="min-h-screen bg-core-bg px-5 py-8 text-core-text"><div className="mx-auto max-w-5xl space-y-6">
    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-core-text-secondary"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to workspaces</Link>
    <div><p className="text-xs uppercase tracking-widest text-core-accent">WorkflowConnect account</p><h1 className="mt-2 text-3xl font-semibold">Profile & security</h1><p className="mt-2 text-sm text-core-text-secondary">Manage your identity across all your workspaces. Workspace roles are managed separately.</p></div>
    {safeManagement ? <UserProfile path="/account" routing="path" appearance={{ variables: { colorPrimary: "#147D70" } }} /> : <section role="status" className="rounded-2xl border border-core-border bg-core-card p-6"><h2 className="flex items-center gap-2 font-semibold"><LockKeyhole aria-hidden="true" className="h-5 w-5 text-core-accent" />Account management is temporarily unavailable</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-core-text-secondary">Account security settings need attention before profile management can open safely. Your workspaces and memberships have not been changed.</p><p className="mt-3 text-sm text-core-text-secondary">{supportEmail ? <a href={`mailto:${supportEmail}`} className="text-core-accent underline">Contact WorkflowConnect support</a> : <Link href="/auth-help" className="text-core-accent underline">View account help</Link>}</p></section>}
    <section className="rounded-2xl border border-core-border bg-core-card p-5"><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-300" />Protect your business access</h2><p className="mt-2 text-sm leading-6 text-core-text-secondary">Before requesting account deletion, transfer ownership of every workspace where you are the last active owner. Account deletion is handled through a verified support process.</p><p className="mt-2 text-sm leading-6 text-core-text-secondary">Use Clerk’s account settings to manage verified emails, connected sign-in methods, passwords, and available multi-factor authentication. If an option is unavailable, contact support.</p></section>
    <Link href="/account/legal" className="inline-block text-sm text-core-accent underline">Review legal document versions</Link>
    {dataAccessEnabled() && <Link href="/account/data" className="block text-core-accent underline">Workspace exports & recovery</Link>}
    {marketRehearsalAvailable() && <Link href="/account/market" className="block text-core-accent underline">Business market inquiries</Link>}
    <LegalLinks />{!legalReady && <p className="text-xs text-core-muted">WorkflowConnect legal documents are drafts awaiting approval and final effective dates.</p>}
  </div></main>;
}
