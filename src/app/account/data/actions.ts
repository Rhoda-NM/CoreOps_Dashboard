"use server";
import { reverificationError } from "@clerk/nextjs/server";
import { requestExport, prepareExport,cancelExport } from "@/server/data-access/exports";
import { requestRecovery, reviewRecovery, revokeRecovery } from "@/server/data-access/recovery";
import { sensitiveIdentity, StepUpRequired } from "@/server/data-access/security";
export type DataResult = { error?: string; success?: string; download?: { id: string; token: string; expiresAt: string } };
export async function dataAction(data: FormData) {
  const value = (key: string) => String(data.get(key) ?? "");
  try {
    await sensitiveIdentity();
    switch (value("operation")) {
      case "export": {
        const row = await requestExport(value("workspaceId"), value("key"), value("recoveryId") || null);
        return { success: "Export prepared. The encrypted artifact is available for up to 24 hours from completion; this single-use download authorization lasts at most five minutes. Recovery grants may expire earlier.", download: await prepareExport(row.id) };
      }
      case "prepare": return { download: await prepareExport(value("id")) };
      case "cancelExport": await cancelExport(value("id"));return {success:"Export canceled with an audit record. Request a replacement separately."};
      case "recover": { const row = await requestRecovery(value("workspaceId"), value("claimReference"), value("key")); return { success: `Recovery request recorded: ${row.id}. Review is required; no access or subscription has been restored.` }; }
      case "review": await reviewRecovery(value("id"), { approve: value("approve") === "true", export: data.get("export") === "on", reactivate: data.get("reactivate") === "on", minutes: Number(value("minutes")), reason: value("reason"), evidence: value("evidence"), ownershipVerified: data.get("ownershipVerified") === "on" }); return { success: "Review recorded. Approval does not activate a subscription or change membership." };
      case "revoke": await revokeRecovery(value("id"), value("reason")); return { success: "Recovery authorization revoked." };
      default: return { error: "Unavailable operation." };
    }
  } catch (error) {
    if (error instanceof StepUpRequired) return reverificationError("strict_mfa");
    return { error: "Unable to complete this operation. Verify your identity, MFA and current authority. For an interrupted download, obtain fresh authorization while the artifact remains available. Oversized exports require support." };
  }
}
