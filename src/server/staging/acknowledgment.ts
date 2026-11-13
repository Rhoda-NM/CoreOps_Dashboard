import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "../db/prisma";
import { requireClerkIdentity } from "../auth/clerk-identity";
import { requireStagingEnvironment } from "./environment";
import { AccessError } from "../authorization/errors";
export const stagingNotice = "SYNTHETIC STAGING TEST AGREEMENT v1\nThis is a test environment. Use synthetic business and personal records only. Payments use Paystack Test Mode and confer no production service entitlement. Do not enter real customer records, credentials or sensitive data. This acknowledgment records participation in synthetic testing; it is not approval or execution of production Terms, Privacy Policy or a customer DPA.";
export const stagingNoticeHash = createHash("sha256").update(stagingNotice, "utf8").digest("hex");
export async function hasStagingAcknowledgment(userId: string) {
  const environment = await requireStagingEnvironment();
  return !!await prisma.stagingAcknowledgment.findUnique({ where: { userId_stagingEnvironmentId_contentHash: { userId, stagingEnvironmentId: environment.id, contentHash: stagingNoticeHash } } });
}
export async function acknowledgeStaging(accepted: boolean) {
  if (accepted !== true) throw new AccessError("FORBIDDEN");
  const profile = await requireClerkIdentity();
  return prisma.$transaction(async tx => {
    const environment = await requireStagingEnvironment(tx);
    const user = await tx.user.findUniqueOrThrow({ where: { externalId: profile.id } });
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
    await tx.stagingAcknowledgment.upsert({ where: { userId_stagingEnvironmentId_contentHash: { userId: user.id, stagingEnvironmentId: environment.id, contentHash: stagingNoticeHash } }, update: {}, create: { userId: user.id, stagingEnvironmentId: environment.id, content: stagingNotice, contentHash: stagingNoticeHash } });
  });
}
