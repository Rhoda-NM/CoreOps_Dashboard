"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkOwnPayment } from "./actions";
export function PaymentCompletion({ reference }: { reference: string }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof checkOwnPayment>> | null>(null);
  const [pending, startTransition] = useTransition();
  const checked = useRef("");
  function check() { startTransition(async () => { setResult(await checkOwnPayment(reference)); }); }
  useEffect(() => {
    if (checked.current === reference) return;
    checked.current = reference;
    startTransition(async () => { setResult(await checkOwnPayment(reference)); });
  }, [reference]);
  return <section className="space-y-4"><p role="status" aria-live="polite">{pending ? "Checking your payment securely…" : result?.message}</p>{result?.activated && result.path ? <a className="inline-block rounded-xl bg-core-primary px-5 py-3" href={result.path.replace(/\/subscription$/, "")}>Open your workspace</a> : <button type="button" onClick={check} disabled={pending} className="rounded-xl bg-core-primary px-5 py-3 disabled:opacity-50">Check payment status</button>}</section>;
}
