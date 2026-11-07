"use client";
import Link from "next/link";
export default function AccountError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 px-5 py-12 text-core-text"><h1 className="text-2xl font-semibold">Account verification is unavailable</h1><p className="text-sm leading-6 text-core-text-secondary">We couldn’t verify your account safely. Wait a moment and try again, or review the recovery guidance.</p><button type="button" onClick={reset} className="rounded-lg border border-core-border px-4 py-2">Try again</button><Link href="/auth-help" className="ml-4 text-sm text-indigo-300 underline">Account help</Link></main>;
}
