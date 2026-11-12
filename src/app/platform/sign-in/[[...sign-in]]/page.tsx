import { requireCentralHost } from "@/server/routing/request-context";
import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { platformEntry } from "@/server/commercial/platform-auth";
export const dynamic = "force-dynamic";
export default async function PlatformSignIn() {
  await requireCentralHost();
  if ((await auth()).userId) {
    const entry = await platformEntry();
    if (!entry.admin) redirect("/platform/access-denied");
    redirect(entry.mfa ? "/platform" : entry.canReverify ? "/platform/verify" : "/platform/access-denied");
  }
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-core-bg px-5 py-12 text-core-text"><header className="max-w-md text-center"><p className="text-sm text-core-accent">WorkflowConnect · Private administration</p><h1 className="mt-3 text-3xl font-semibold">Administrator sign in</h1><p className="mt-3 text-sm text-core-text-secondary">Access requires an explicitly provisioned administrator identity and recent MFA. Signing in never grants administrator privileges.</p></header><SignIn path="/platform/sign-in" routing="path" withSignUp={false} forceRedirectUrl="/platform" fallbackRedirectUrl="/platform" appearance={{ elements: { footerAction: { display: "none" } } }} /></main>;
}
