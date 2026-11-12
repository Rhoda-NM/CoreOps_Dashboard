"use client";
import { useReverification } from "@clerk/nextjs";
import { useState } from "react";
import { verifyPlatformSession } from "./actions";

export function PlatformVerification() {
  const verify = useReverification(verifyPlatformSession);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function handleVerification() {
    setBusy(true);
    setMessage("");
    try {
      const result = await verify();
      if (result?.status === "verified") {
        // A fresh document request obtains the updated session and rechecks all
        // server gates; no client state or query string grants access.
        window.location.assign("/platform");
        return;
      }
      setMessage(result?.status === "denied" ? "Access is unavailable. Contact the platform operator." : "Verification was canceled. You can try again.");
    } catch {
      setMessage("Verification could not be completed. Try again or contact the platform operator.");
    } finally { setBusy(false); }
  }
  return <div className="space-y-4"><button type="button" disabled={busy} onClick={handleVerification} className="rounded-lg bg-core-primary px-5 py-3 font-medium disabled:opacity-50">{busy ? "Verifying…" : "Verify administrator access"}</button><p role="status" aria-live="polite" className="text-sm text-core-text-secondary">{message}</p></div>;
}
