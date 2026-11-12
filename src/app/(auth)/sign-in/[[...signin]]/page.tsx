import { authAppearance } from "@/components/auth/appearance";
import { auth } from "@clerk/nextjs/server";
import { ExistingAuthSession } from "@/components/auth/ExistingAuthSession";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { requireCentralHost } from "@/server/routing/request-context";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { centralUrl } from "@/lib/routing/host-policy";
export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { policy } = await requireCentralHost();
  const intent = safeAuthReturn((await searchParams).returnTo);
  const destination = centralUrl(policy, intent);
  const { userId } = await auth();
  if (userId) return <AuthShell><ExistingAuthSession destination={destination} restartUrl={centralUrl(policy, `/sign-in?${new URLSearchParams({ returnTo: intent })}`)} /></AuthShell>;
  return <AuthShell><SignIn path="/sign-in" routing="path" forceRedirectUrl={destination} signUpForceRedirectUrl={destination} signUpUrl={centralUrl(policy, `/sign-up?${new URLSearchParams({ returnTo: intent })}`)} appearance={authAppearance} /></AuthShell>;
}
