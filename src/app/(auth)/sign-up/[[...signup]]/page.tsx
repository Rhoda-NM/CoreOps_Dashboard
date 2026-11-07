import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthConfiguration } from "@/config/auth";
import { isRegistrationReady } from "@/server/auth/clerk-configuration";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const config = getAuthConfiguration();
  const ready = await isRegistrationReady();
  return <AuthShell registering>{ready ? <>
    <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/onboarding" signInFallbackRedirectUrl="/dashboard" signInUrl="/sign-in" appearance={{ options: { termsPageUrl: "/terms", privacyPageUrl: "/privacy" }, variables: { colorPrimary: "#6366F1" } }} />
    {!config.legalReady && <p className="mt-4 text-xs leading-5 text-core-text-secondary">The Terms of Service and Privacy Policy below are drafts awaiting approval. Draft documents are not presented for mandatory acceptance.</p>}
    <p className="mt-4 text-xs leading-5 text-core-text-secondary">Account creation does not subscribe you to marketing communications.</p>
  </> : <div role="status" className="rounded-2xl border border-core-border bg-core-card p-6"><h2 className="text-lg font-semibold">Registration is temporarily unavailable</h2><p className="mt-3 text-sm leading-6 text-core-text-secondary">Please try again later. Existing users can still sign in to their accounts.</p><Link href="/sign-in" className="mt-5 inline-block rounded-lg bg-core-primary px-4 py-2 text-sm text-white">Sign in</Link></div>}</AuthShell>;
}
