import Link from "next/link";
import { paymentReturnReference } from "@/lib/routing/navigation";
import { paymentReturnPath } from "@/server/payments/payment-return";
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ attempt?: string | string[]; reference?: string | string[]; trxref?: string | string[] }> }) {
  const path = await paymentReturnPath(paymentReturnReference(await searchParams));
  return <main className="mx-auto max-w-xl space-y-5 px-6 py-20 text-core-text"><h1 className="text-3xl font-semibold">Payment verification in progress</h1><p className="text-core-text-secondary">Returning from checkout does not confirm receipt or activate your workspace. WorkflowConnect verifies the transaction server-side, then a platform super administrator reviews activation.</p><Link href={path} prefetch={false} className="text-core-accent underline">{path === "/dashboard" ? "Return to your workspaces" : "Return to your workspace subscription"}</Link></main>;
}
