"use client";
import { useActionState, useState } from "react";
import { useReverification } from "@clerk/nextjs";
import { dataAction, type DataResult } from "@/app/account/data/actions";
export function DataForm({ children, label }: { children: React.ReactNode; label: string }) {
  const verified = useReverification(dataAction);
  const [state, submit, pending] = useActionState(async (_: DataResult, data: FormData): Promise<DataResult> => {
    try { return await verified(data); } catch { return { error: "Verification canceled or unavailable. Try again after checking account security." }; }
  }, {});
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const download = useReverification(async () => {
    if (!state.download) return { error: "Unavailable" };
    const response = await fetch(`/account/data/exports/${encodeURIComponent(state.download.id)}/download`, { method: "POST", body: new URLSearchParams({ token: state.download.token }), cache: "no-store", redirect: "error" });
    if (response.headers.get("content-type")?.includes("application/json")) return response.json();
    if (!response.ok || !response.headers.get("content-type")?.startsWith("application/zip")) return { error: "Unavailable" };
    return { blob: await response.blob() };
  });
  async function save() {
    setDownloading(true);
    try {
      const result = await download();
      if (!result.blob) { setMessage("Download unavailable. Refresh status, verify your authority or request a new export."); return; }
      const url = URL.createObjectURL(result.blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = "workflowconnect-workspace-export.zip"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Download authorized. This download cannot be replayed. This is not proof of receipt. Obtain fresh authorization to retry while the artifact remains available.");
    } catch { setMessage("Verification canceled or download unavailable."); } finally { setDownloading(false); }
  }
  return <div className="space-y-3"><form action={submit} className="space-y-3"><fieldset disabled={pending} className="space-y-3">{children}<button className="rounded-lg bg-core-primary px-4 py-2 text-white disabled:opacity-50">{pending ? "Working…" : label}</button></fieldset></form>{state.error && <p role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}{state.download && <button type="button" disabled={downloading} onClick={save} className="rounded-lg border border-core-border px-4 py-2 disabled:opacity-50">{downloading ? "Downloading…" : "Download private ZIP"}</button>}{message && <p role="status">{message}</p>}</div>;
}
