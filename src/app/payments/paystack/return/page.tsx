import Link from "next/link";
export default function PaymentReturn() {
  return <main className="mx-auto max-w-xl space-y-5 px-6 py-20 text-core-text"><h1 className="text-3xl font-semibold">Payment verification in progress</h1><p className="text-core-text-secondary">Returning from checkout does not confirm receipt or activate your workspace. CoreOps verifies the transaction server-side, then a platform super administrator reviews activation.</p><Link href="/dashboard" className="text-indigo-300 underline">Return to your workspace subscription</Link></main>;
}
