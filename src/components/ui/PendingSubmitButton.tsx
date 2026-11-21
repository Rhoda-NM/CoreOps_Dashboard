"use client";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";

// Presentation only: the containing form/action still validates and authorizes.
export function PendingSubmitButton({ children, pendingLabel = "Continuing…" }: { children: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} aria-busy={pending}>{pending ? pendingLabel : children}</Button>;
}
