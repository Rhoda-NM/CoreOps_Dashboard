import "server-only";
import type { Prisma, WorkspaceLifecycleEventType } from "@prisma/client";
import { LIFECYCLE_POLICY_VERSION } from "../lifecycle/policy";
export async function dataEvent(tx: Prisma.TransactionClient, input: { workspaceId: string; episodeId: string; type: WorkspaceLifecycleEventType; exportId?: string; recoveryId?: string; effectiveAt?: Date; operationKey?:string }, now: Date) {
  const { effectiveAt = now, operationKey:requestedKey, ...reference } = input;
  const operationKey = requestedKey??`${input.exportId ?? input.recoveryId}:${input.type}`;
  const existing = await tx.workspaceLifecycleEvent.upsert({ where: { operationKey }, update: {}, create: { ...reference, operationKey, effectiveAt, recordedAt: now, policyVersion: LIFECYCLE_POLICY_VERSION } });
  if (existing.workspaceId !== input.workspaceId || existing.episodeId !== input.episodeId || existing.type !== input.type || existing.exportId !== (input.exportId ?? null) || existing.recoveryId !== (input.recoveryId ?? null) || +existing.effectiveAt !== +effectiveAt) throw new Error("Data event operation conflict");
}
