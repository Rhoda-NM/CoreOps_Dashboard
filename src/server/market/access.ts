import "server-only";
import type { Prisma } from "@prisma/client";
import { AccessError } from "../authorization/errors";
import { requirePay1Case, requirePay1Workspace } from "../preview/pay1-admission";
import { pay1Enabled } from "../preview/pay1-config";
import { requireMarketRehearsal } from "./config";
export async function requireApplicationEligibility(tx: Prisma.TransactionClient, applicationId: string, newUse = true) {
  requireMarketRehearsal();
  await requirePay1Case(tx, applicationId);
  const row = await tx.marketApplication.findUniqueOrThrow({ where: { id: applicationId } });
  if (row.state !== "APPROVED" || !row.currentDecisionId || !row.operativeSubmissionId || (newUse && row.latestSubmissionId !== row.operativeSubmissionId)) throw new AccessError("FORBIDDEN");
  const decision = await tx.marketDecision.findFirstOrThrow({ where: { id: row.currentDecisionId, applicationId, submissionId: row.operativeSubmissionId } });
  if (pay1Enabled()) {
    const submission = await tx.marketSubmission.findUniqueOrThrow({ where: { id: row.operativeSubmissionId } });
    if (submission.country !== "KE") throw new AccessError("FORBIDDEN");
  }
  const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  if ((pay1Enabled() && decision.type !== "OPEN_POLICY") || !["OPEN_POLICY", "APPROVE"].includes(decision.type) || decision.effectiveAt > now || (decision.type === "APPROVE" && (!decision.validUntil || decision.validUntil <= now))) throw new AccessError("FORBIDDEN");
  return row;
}
export async function requireWorkspaceMarket(tx: Prisma.TransactionClient, workspaceId: string, newUse = true) {
  await requirePay1Workspace(tx, workspaceId);
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { marketApplicationId: true } });
  // Existing unlinked customers retain prior behavior. No service can provision a
  // new unlinked workspace. Legacy classification/enforcement needs separate review.
  if (!workspace.marketApplicationId) return;
  await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${workspace.marketApplicationId} FOR UPDATE`;
  return requireApplicationEligibility(tx, workspace.marketApplicationId, newUse);
}
