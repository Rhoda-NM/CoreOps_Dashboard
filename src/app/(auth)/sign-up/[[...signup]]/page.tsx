import { pay1AuthenticationFormsEnabled } from "@/server/preview/pay1-config";
import { authAppearance } from "@/components/auth/appearance";
import { auth } from "@clerk/nextjs/server";
import { ExistingAuthSession } from "@/components/auth/ExistingAuthSession";
import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { getAuthConfiguration } from "@/config/auth";
import { isRegistrationReady } from "@/server/auth/clerk-configuration";
import { requireCentralHost } from "@/server/routing/request-context";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { centralUrl, marketingUrl } from "@/lib/routing/host-policy";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { policy } = await requireCentralHost();
  const intent = safeAuthReturn((await searchParams).returnTo, "/onboarding");
  const destination = centralUrl(policy, intent);
  const config = getAuthConfiguration();
  const { userId } = await auth();
  if (userId) return <AuthShell registering><ExistingAuthSession destination={destination} restartUrl={centralUrl(policy, `/sign-up?${new URLSearchParams({ returnTo: intent })}`)} /></AuthShell>;
  const testRegistration = pay1AuthenticationFormsEnabled();
  // Viewing a test registration form must not depend on admission/provisioning.
  const ready = testRegistration || await isRegistrationReady();
  return <AuthShell registering>{ready ? <>
    {testRegistration && <p role="note" className="mb-4 rounded-xl border border-brand-line p-4 text-sm leading-6 text-brand-muted">Payment testing only. Create a synthetic test account, not a customer account. Registration does not approve the draft legal documents or activate a subscription. Your Clerk user ID must be included in this preview’s test admission before you can continue to business onboarding.</p>}
    <SignUp path="/sign-up" routing="path" forceRedirectUrl={destination} signInForceRedirectUrl={destination} signInUrl={centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: intent })}`)} appearance={{ ...authAppearance, options: { termsPageUrl: marketingUrl(policy, "/terms"), privacyPageUrl: marketingUrl(policy, "/privacy") } }} />
    {!config.legalReady && <p className="mt-4 text-sm leading-6 text-brand-muted">The Terms of Service and Privacy Policy below are drafts awaiting approval. Draft documents are not presented for mandatory acceptance.</p>}
    <p className="mt-4 text-sm leading-6 text-brand-muted">Account creation does not subscribe you to marketing communications.</p>
  </> : <div role="status" className="rounded-2xl border border-brand-line bg-white p-6"><h2 className="text-lg font-semibold">Registration is temporarily unavailable</h2><p className="mt-3 text-sm leading-6 text-brand-muted">Please try again later. Existing users can still sign in to their accounts.</p><Link href={centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: intent })}`)} className="mt-5 inline-block rounded-lg bg-core-primary px-4 py-2 text-sm text-white">Sign in</Link></div>}</AuthShell>;
}
