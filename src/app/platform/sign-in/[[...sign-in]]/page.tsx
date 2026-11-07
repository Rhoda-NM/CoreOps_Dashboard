import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function PlatformSignIn() {
  if ((await auth()).userId) redirect("/platform");
  return <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-core-bg px-5 py-12 text-core-text"><header className="max-w-md text-center"><p className="text-sm text-indigo-300">CoreOps · Private administration</p><h1 className="mt-3 text-3xl font-semibold">Administrator sign in</h1><p className="mt-3 text-sm text-core-text-secondary">Access requires an explicitly provisioned administrator identity and recent MFA. Signing in never grants administrator privileges.</p></header><SignIn path="/platform/sign-in" routing="path" withSignUp={false} forceRedirectUrl="/platform" fallbackRedirectUrl="/platform" appearance={{ elements: { footerAction: { display: "none" } } }} /></main>;
}
