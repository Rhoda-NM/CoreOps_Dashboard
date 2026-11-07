import Link from "@/components/workspaces/SiteLink";
import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { IdentityError, type IdentityFailure } from "@/server/auth/identity-error";
import { prisma } from "@/server/db/prisma";
import { getAuthConfiguration } from "@/config/auth";
import { isRegistrationReady } from "@/server/auth/clerk-configuration";
import { LegalLinks } from "@/components/auth/LegalLinks";

const guidance: Record<IdentityFailure | "READY", { title: string; message: string }> = {
  IDENTITY_CONFLICT: { title: "Let’s recover your WorkflowConnect access safely", message: "We couldn’t safely connect this sign-in to a WorkflowConnect profile. Try your original sign-in method. If you still need help, contact support for a verified review. We never merge accounts or transfer workspace access automatically." },
  VERIFICATION_REQUIRED: { title: "Verify your email to continue", message: "Use Clerk’s verification prompts to verify your primary email address. This protects your account and any workspace invitations." },
  ACCOUNT_UNAVAILABLE: { title: "This sign-in is no longer available", message: "Sign out and sign in again. If the problem continues, contact support. Your local workspace records have not been deleted or transferred." },
  SESSION_UNAVAILABLE: { title: "Please sign in again", message: "Your session is no longer active. Sign out, then sign in again with your usual method." },
  PROVIDER_UNAVAILABLE: { title: "We couldn’t verify your sign-in right now", message: "The identity service is temporarily unavailable or busy. Wait a moment and try again. We have not changed your workspaces or access." },
  LEGAL_ACCEPTANCE_REQUIRED: { title: "Account setup needs attention", message: "Registration requirements are not complete. Please return to registration or contact support before continuing." },
  READY: { title: "Continue with your WorkflowConnect account", message: "Return to your workspaces, or open account settings to review your sign-in methods. Connecting methods through Clerk’s verified flow keeps your WorkflowConnect identity intact." },
};

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  let reason: IdentityFailure | "READY" = "READY";
  try {
    const profile = await requireClerkIdentity();
    const owner = await prisma.user.findFirst({ where: { email: { equals: profile.primaryEmailAddress!.emailAddress.trim(), mode: "insensitive" } }, select: { externalId: true } });
    if (owner && owner.externalId !== profile.id) reason = "IDENTITY_CONFLICT";
    else if (!owner && getAuthConfiguration().requireLegal && (!profile.legalAcceptedAt || !await isRegistrationReady())) reason = "LEGAL_ACCEPTANCE_REQUIRED";
  } catch (error) {
    reason = error instanceof IdentityError ? error.reason : "PROVIDER_UNAVAILABLE";
  }
  const { title, message } = guidance[reason];
  const { supportEmail } = getAuthConfiguration();
  return <main className="flex min-h-screen items-center justify-center bg-core-bg px-5 py-10 text-core-text"><section className="w-full max-w-xl space-y-5 rounded-2xl border border-core-border bg-core-card p-6 sm:p-8"><ShieldAlert aria-hidden="true" className="h-8 w-8 text-core-accent" /><p className="text-xs uppercase tracking-widest text-core-accent">WorkflowConnect account help</p><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm leading-7 text-core-text-secondary">{message}</p><div className="flex flex-wrap gap-3"><Link href={reason === "READY" ? "/dashboard" : "/account"} className="rounded-lg bg-core-primary px-4 py-2 text-sm text-white">{reason === "READY" ? "Return to workspaces" : "Account settings"}</Link><SignOutButton redirectUrl="/sign-in"><button type="button" className="rounded-lg border border-core-border px-4 py-2 text-sm">Sign out</button></SignOutButton><Link href="/auth-help" className="self-center text-sm text-core-accent underline">Recovery guidance</Link></div>{supportEmail && <a href={`mailto:${supportEmail}`} className="inline-block text-sm text-core-accent underline">Contact WorkflowConnect support</a>}<p className="text-xs leading-5 text-core-muted">Never share passwords, verification codes, session cookies, or recovery codes with support.</p><LegalLinks /></section></main>;
}
