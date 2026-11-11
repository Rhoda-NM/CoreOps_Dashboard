import Link from "@/components/workspaces/SiteLink";
import { SignOutButton } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";
import { requireClerkIdentity } from "@/server/auth/clerk-identity";
import { unstable_rethrow } from "next/navigation";
import { accountEntryFailure, type AccountEntryFailure } from "@/server/auth/account-entry";
import { pay1Enabled } from "@/server/preview/pay1-config";
import { prisma } from "@/server/db/prisma";
import { getAuthConfiguration } from "@/config/auth";
import { isRegistrationReady } from "@/server/auth/clerk-configuration";
import { LegalLinks } from "@/components/auth/LegalLinks";

const guidance: Record<AccountEntryFailure | "READY", { title: string; message: string }> = {
  IDENTITY_CONFLICT: { title: "Let’s recover your WorkflowConnect access safely", message: "We couldn’t safely connect this sign-in to a WorkflowConnect profile. Try your original sign-in method. If you still need help, contact support for a verified review. We never merge accounts or transfer workspace access automatically." },
  VERIFICATION_REQUIRED: { title: "Verify your email to continue", message: "Use Clerk’s verification prompts to verify your primary email address. This protects your account and any workspace invitations." },
  ACCOUNT_UNAVAILABLE: { title: "This sign-in is no longer available", message: "Sign out and sign in again. If the problem continues, contact support. Your local workspace records have not been deleted or transferred." },
  SESSION_UNAVAILABLE: { title: "Please sign in again", message: "Your session is no longer active. Sign out, then sign in again with your usual method." },
  PROVIDER_UNAVAILABLE: { title: "We couldn’t verify your sign-in right now", message: "The identity service is temporarily unavailable or busy. Wait a moment and try again. We have not changed your workspaces or access." },
  LEGAL_ACCEPTANCE_REQUIRED: { title: "Account setup needs attention", message: "Registration requirements are not complete. Please return to registration or contact support before continuing." },
  PAY1_REGISTRATION_UNAVAILABLE: { title: "Preview account registration needs attention", message: "The admitted test account could not complete registration readiness. Verify the active test admission, Clerk test configuration availability and disabled self-service deletion. Draft legal approval is not required for PAY-1." },
  PAY1_CONFIGURATION_REQUIRED: { title: "Preview test configuration needs attention", message: "The PAY-1 environment settings are incomplete or incompatible. The operator must verify the Preview target, system environment identifiers, HTTPS origins, test keys and disabled feature flags. Signing in again will not repair this configuration." },
  PAY1_SCHEMA_REQUIRED: { title: "Preview admission schema is unavailable", message: "The application cannot find the required admission table or columns in its connected database. Verify the actual database target and applied migrations before continuing. Do not reset the database." },
  PAY1_ADMISSION_REQUIRED: { title: "Preview test admission is missing", message: "Migrations created the admission structure, but this preview has no matching admission record. The operator must prepare the reviewed admission before testing can continue." },
  PAY1_ADMISSION_UNAVAILABLE: { title: "Preview test admission could not be checked", message: "The admission database check failed. The operator must review database connectivity, permissions and deployment compatibility. No test access was granted." },
  PAY1_TARGET_MISMATCH: { title: "This deployment does not match its test admission", message: "The current deployment, origin, database or Clerk instance does not match the recorded admission. Redeployment changes the deployment identifier. Ask the operator to review the current target and outstanding test cases; do not disable the checks or rebind old cases." },
  PAY1_WINDOW_CLOSED: { title: "The preview test window is closed", message: "The test admission has not started, has expired or was revoked. The operator must review the testing window before new access is allowed." },
  PAY1_ACTOR_NOT_ADMITTED: { title: "Your test account is not admitted yet", message: "Clerk recognized your account, but its user ID is not included in this preview’s test admission. Ask the operator to review the intended synthetic tester. Creating another account will not grant access." },
  ACCOUNT_SCHEMA_REQUIRED: { title: "Account database schema needs attention", message: "The deployed application and connected database do not have matching account tables or columns. The operator must verify the target, migration history and matching application build." },
  ACCOUNT_DATABASE_UNAVAILABLE: { title: "The account database could not be reached", message: "The operator must review the application’s database connection and credentials. Do not share connection strings, keys or passwords in an error report." },
  READY: { title: "Continue with your WorkflowConnect account", message: "Return to your workspaces, or open account settings to review your sign-in methods. Connecting methods through Clerk’s verified flow keeps your WorkflowConnect identity intact." },
};

export const dynamic = "force-dynamic";

export default async function RecoveryPage() {
  let reason: AccountEntryFailure | "READY" = "READY";
  try {
    const profile = await requireClerkIdentity();
    const owner = await prisma.user.findFirst({ where: { email: { equals: profile.primaryEmailAddress!.emailAddress.trim(), mode: "insensitive" } }, select: { externalId: true } });
    if (owner && owner.externalId !== profile.id) reason = "IDENTITY_CONFLICT";
    else if (!owner && getAuthConfiguration().requireLegal) {
      if (pay1Enabled()) { if (!await isRegistrationReady()) reason = "PAY1_REGISTRATION_UNAVAILABLE"; }
      else if (!profile.legalAcceptedAt || !await isRegistrationReady()) reason = "LEGAL_ACCEPTANCE_REQUIRED";
    }
  } catch (error) {
    unstable_rethrow(error);
    reason = accountEntryFailure(error) ?? "PROVIDER_UNAVAILABLE";
  }
  const { title, message } = guidance[reason];
  const { supportEmail } = getAuthConfiguration();
  return <main className="flex min-h-screen items-center justify-center bg-core-bg px-5 py-10 text-core-text"><section className="w-full max-w-xl space-y-5 rounded-2xl border border-core-border bg-core-card p-6 sm:p-8"><ShieldAlert aria-hidden="true" className="h-8 w-8 text-core-accent" /><p className="text-xs uppercase tracking-widest text-core-accent">WorkflowConnect account help</p><h1 className="text-2xl font-semibold">{title}</h1><p className="text-sm leading-7 text-core-text-secondary">{message}</p>{reason !== "READY" && <p className="text-xs text-core-muted">Access check: <code>{reason}</code></p>}<div className="flex flex-wrap gap-3"><Link href={reason === "READY" ? "/dashboard" : "/auth-help"} className="rounded-lg bg-core-primary px-4 py-2 text-sm text-white">{reason === "READY" ? "Return to workspaces" : "Get account help"}</Link><SignOutButton redirectUrl="/sign-in"><button type="button" className="rounded-lg border border-core-border px-4 py-2 text-sm">Sign out</button></SignOutButton><Link href="/auth-help" className="self-center text-sm text-core-accent underline">Recovery guidance</Link></div>{supportEmail && <a href={`mailto:${supportEmail}`} className="inline-block text-sm text-core-accent underline">Contact WorkflowConnect support</a>}<p className="text-xs leading-5 text-core-muted">Never share passwords, verification codes, session cookies, or recovery codes with support.</p><LegalLinks /></section></main>;
}
