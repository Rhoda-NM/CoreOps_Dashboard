import Link from "next/link";
import { redirect } from "next/navigation";
import { platformEntry } from "@/server/commercial/platform-auth";
import { PlatformVerification } from "./PlatformVerification";
export const dynamic = "force-dynamic";

export default async function PlatformVerify() {
  const entry = await platformEntry();
  if (!entry.signedIn) redirect("/platform/sign-in");
  if (!entry.admin || (!entry.mfa && !entry.canReverify)) redirect("/platform/access-denied");
  if (entry.mfa) redirect("/platform");
  return <main className="mx-auto max-w-xl space-y-6 px-6 py-20 text-core-text"><h1 className="text-3xl font-semibold">Verify administrator access</h1><p className="text-core-text-secondary">Confirm your authentication factors through Clerk to continue. Administrator access requires recent multi-factor verification, even when you are already signed in.</p><PlatformVerification /><Link className="inline-block text-core-accent underline" href="/dashboard">Return to my workspaces</Link></main>;
}
