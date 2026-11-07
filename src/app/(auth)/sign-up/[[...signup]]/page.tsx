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
  const ready = await isRegistrationReady();
  return <AuthShell registering>{ready ? <>
    <SignUp path="/sign-up" routing="path" forceRedirectUrl={destination} signInForceRedirectUrl={destination} signInUrl={centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: intent })}`)} appearance={{ options: { termsPageUrl: marketingUrl(policy, "/terms"), privacyPageUrl: marketingUrl(policy, "/privacy") }, variables: { colorPrimary: "#147D70" } }} />
    {!config.legalReady && <p className="mt-4 text-xs leading-5 text-core-text-secondary">The Terms of Service and Privacy Policy below are drafts awaiting approval. Draft documents are not presented for mandatory acceptance.</p>}
    <p className="mt-4 text-xs leading-5 text-core-text-secondary">Account creation does not subscribe you to marketing communications.</p>
  </> : <div role="status" className="rounded-2xl border border-core-border bg-core-card p-6"><h2 className="text-lg font-semibold">Registration is temporarily unavailable</h2><p className="mt-3 text-sm leading-6 text-core-text-secondary">Please try again later. Existing users can still sign in to their accounts.</p><Link href={centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: intent })}`)} className="mt-5 inline-block rounded-lg bg-core-primary px-4 py-2 text-sm text-white">Sign in</Link></div>}</AuthShell>;
}
