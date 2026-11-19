import { initialStagingSetupRequired } from "@/server/staging/setup-authorization";
import { requireCentralHost } from "@/server/routing/request-context";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { platformEntry } from "@/server/commercial/platform-auth";
export const dynamic = "force-dynamic";
export default async function PlatformSignIn({ searchParams }: { searchParams?: Promise<{ setup?: string }> } = {}) {
  const setup = (await searchParams)?.setup === "1";
  const destination = setup ? "/platform/verify?setup=1" : "/platform";
  await requireCentralHost();
  let setupReady = true;
  if (setup) {
    try { const { initialStagingSetupTarget } = await import("@/server/staging/setup-authorization"); await initialStagingSetupTarget(); }
    catch { setupReady = false; }
  }
  if ((await auth()).userId && (!setup || setupReady)) {
    if (setup) {
      const { stagingSetupEntry } = await import("@/server/staging/setup-authorization");
      if (!await stagingSetupEntry()) redirect("/platform/access-denied");
      redirect(destination);
    }
    if (await initialStagingSetupRequired()) redirect("/platform/verify?setup=1");
    const entry = await platformEntry();
    if (!entry.admin) redirect("/platform/access-denied");
    redirect(entry.mfa ? "/platform" : entry.canReverify ? "/platform/verify" : "/platform/access-denied");
  }
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-core-bg px-5 py-12 text-core-text"><header className="max-w-md text-center"><p className="text-sm text-core-accent">WorkflowConnect · Private administration</p><h1 className="mt-3 text-3xl font-semibold">{setup ? "Sign in to authorize staging setup" : "Administrator sign in"}</h1><p className="mt-3 text-sm text-core-text-secondary">Access requires an explicitly provisioned administrator identity and recent MFA. Signing in never grants administrator privileges.</p></header>{setup && <p data-staging-setup-ready={String(setupReady)} className="max-w-md text-center text-sm text-core-text-secondary">{setupReady ? "Staging setup target verified. Sign in with the existing administrator to authorize initialization." : "Staging setup configuration is unavailable. Contact the operator before continuing."}</p>}{setupReady && <SignIn path="/platform/sign-in" routing="path" withSignUp={false} forceRedirectUrl={destination} fallbackRedirectUrl={destination} appearance={{ elements: { footerAction: { display: "none" } } }} />}</main>;
}
