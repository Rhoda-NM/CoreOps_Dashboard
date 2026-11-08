import { authAppearance } from "@/components/auth/appearance";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/AuthShell";
import { requireCentralHost } from "@/server/routing/request-context";
import { safeAuthReturn } from "@/lib/routing/navigation";
import { centralUrl } from "@/lib/routing/host-policy";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { policy } = await requireCentralHost();
  const intent = safeAuthReturn((await searchParams).returnTo);
  const destination = centralUrl(policy, intent);
  return <AuthShell><SignIn path="/sign-in" routing="path" forceRedirectUrl={destination} signUpForceRedirectUrl={destination} signUpUrl={centralUrl(policy, `/sign-up?${new URLSearchParams({ returnTo: intent })}`)} appearance={authAppearance} /></AuthShell>;
}
