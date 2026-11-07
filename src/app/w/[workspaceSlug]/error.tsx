"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <main className="p-8 text-core-text"><h1 className="text-xl font-semibold">Unable to open this workspace resource</h1><p className="my-4">Check that you have access, or try again.</p><button type="button" onClick={reset} className="rounded border p-2">Try again</button><Link href="/account/recovery" className="ml-4 text-sm text-indigo-300 underline">Review account access</Link></main>;
}
