"use client";
import Link from "next/link";
export default function PlatformError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 p-8 text-core-text"><h1 className="text-2xl font-semibold">Platform access unavailable</h1><p className="text-core-text-secondary">Platform operations require an active administrator account, a verified identity, and recent multi-factor authentication. Sign in again with MFA if your verification has expired. Contact the platform operator if access is still unavailable.</p><div className="flex flex-wrap gap-4"><button className="rounded-lg bg-indigo-600 px-4 py-2" onClick={reset}>Try again</button><Link className="underline" href="/account">Account security</Link><Link className="underline" href="/dashboard">My workspaces</Link></div></main>;
}
