import "server-only";
import type { Prisma, WorkspaceRecoveryRequest } from "@prisma/client";
import { lifecycleNow } from "../lifecycle/clock";
import { LIFECYCLE_POLICY_VERSION } from "../lifecycle/policy";
import { recoveryGrant } from "./grants";
import { dataEvent } from "./events";
// Only called inside the existing funded SUPER_ADMIN activation transaction.
export async function restoreAfterPaidActivation(tx: Prisma.TransactionClient, grant: WorkspaceRecoveryRequest, period: { id: string; graceEndsAt: Date }) {
  const now = await lifecycleNow(tx);
  await recoveryGrant(tx, grant.workspaceId, grant.id, grant.requesterId, grant.sourcePeriodId, "reactivate", now);
  await tx.workspaceRecoveryRequest.update({ where: { id: grant.id }, data: { activationPeriodId: period.id, activatedAt: now } });
  await tx.workspaceLifecycle.update({ where: { workspaceId: grant.workspaceId }, data: { sourcePeriodId: period.id, episodeId: period.id, policyVersion: LIFECYCLE_POLICY_VERSION, archivedAt: null, cancellationEffectiveAt: null, cancellationRecordedAt: null, retentionEndsAt: null, nextEvaluationAt: period.graceEndsAt, revision: { increment: 1 } } });
  await dataEvent(tx, { workspaceId: grant.workspaceId, episodeId: grant.sourcePeriodId, recoveryId: grant.id, type: "WORKSPACE_RESTORED" }, now);
}
