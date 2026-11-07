"use client";
import Link from "next/link";
export default function AppError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl space-y-4 px-5 py-12 text-core-text"><h1 className="text-2xl font-semibold">We couldn’t open this page</h1><p className="text-sm leading-6 text-core-text-secondary">Try again in a moment. If this happened after signing in, review your account access before continuing.</p><div className="flex flex-wrap gap-3"><button type="button" onClick={reset} className="rounded-lg bg-core-primary px-4 py-2 text-white">Try again</button><Link href="/account/recovery" className="rounded-lg border border-core-border px-4 py-2">Review account access</Link></div></main>;
}
