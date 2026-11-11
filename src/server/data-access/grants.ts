import "server-only";
import type { Prisma } from "@prisma/client";
import { AccessError } from "../authorization/errors";
import { hash, requireDataAccess } from "./security";
export async function recoveryGrant(tx: Prisma.TransactionClient, workspaceId: string, id: string, requesterId: string, episodeId: string, scope: "export" | "reactivate", now: Date) {
  requireDataAccess();
  const grant = await tx.workspaceRecoveryRequest.findFirst({ where: { id, workspaceId, requesterId, sourcePeriodId: episodeId, status: "APPROVED", revokedAt: null, expiresAt: { gt: now } }, include: { requester: true } });
  if (!grant || (scope==="export"&&!!grant.activatedAt)|| !grant.identityCheckedAt || !grant.ownershipVerifiedAt || grant.requester.externalId !== grant.requesterExternalId || hash(grant.requester.email.toLowerCase()) !== grant.emailHash || (scope === "export" ? !grant.allowExport : !grant.allowReactivation || !!grant.activatedAt)) throw new AccessError("FORBIDDEN");
  return grant;
}
