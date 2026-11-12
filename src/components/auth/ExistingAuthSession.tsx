import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export function ExistingAuthSession({ destination, restartUrl }: { destination: string; restartUrl: string }) {
  return <section className="space-y-4 rounded-2xl border border-brand-line bg-white p-6">
    <h2 className="text-lg font-semibold">An existing sign-in session was found</h2>
    <p className="text-sm leading-6 text-brand-muted">Continue to check this account’s access, or sign out to use a different account. A sign-in session alone does not grant workspace access.</p>
    <div className="flex flex-wrap gap-3">
      <Link href={destination} className="rounded-lg bg-core-primary px-4 py-2 text-sm text-white">Continue with this account</Link>
      <SignOutButton redirectUrl={restartUrl}><button type="button" className="rounded-lg border border-brand-line px-4 py-2 text-sm">Sign out and use another account</button></SignOutButton>
    </div>
  </section>;
}
