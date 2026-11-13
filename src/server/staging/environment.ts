import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { IdentityError } from "../auth/identity-error";
import { stagingTarget } from "./config";
export async function requireStagingEnvironment(db: Prisma.TransactionClient = prisma, operatorTarget?: ReturnType<typeof stagingTarget>, lock = true) {
  const target = operatorTarget ?? stagingTarget();
  if (lock) await db.$queryRaw`SELECT id FROM "StagingEnvironment" WHERE id=${target.id} FOR SHARE`;
  const row = await db.stagingEnvironment.findUnique({ where: { id: target.id } });
  if (!row || !row.active || !row.syntheticOnly || !row.approvalReference || row.projectId !== target.projectId || row.origin !== target.origin || row.databaseHost !== target.databaseHost || row.databaseName !== target.databaseName || row.clerkHost !== target.clerkHost) throw new IdentityError("STAGING_CONFIGURATION_REQUIRED");
  return row;
}
