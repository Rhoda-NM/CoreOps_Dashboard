import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AccessError } from "../authorization/errors";
import { pay1Enabled, pay1Target } from "./pay1-config";
type DB = Prisma.TransactionClient;

// Expiry/revocation deny new use. Reconciliation can retain authenticated money
// evidence for this exact admitted case after its test window closes.
export async function requirePay1Admission(db: DB = prisma, active = true) {
  const target = pay1Target();
  await db.$queryRaw`SELECT id FROM "Pay1PreviewAdmission" WHERE id=${target.id} FOR SHARE`;
  const row = await db.pay1PreviewAdmission.findUniqueOrThrow({ where: { id: target.id } });
  const [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  if (row.id !== target.id || row.projectId !== target.projectId || row.deploymentId !== target.deploymentId || row.origin !== target.origin || row.databaseHost !== target.databaseHost || row.databaseName !== target.databaseName || row.clerkHost !== target.clerkHost || !row.syntheticOnly || !row.approvalReference || (active && (row.revokedAt || now < row.notBefore || now >= row.expiresAt))) throw new AccessError("FORBIDDEN");
  return row;
}
export async function requirePay1Actor(externalId: string, db: DB = prisma) {
  if (!pay1Enabled()) return null;
  const row = await requirePay1Admission(db);
  if (!row.actorExternalIds.includes(externalId)) throw new AccessError("FORBIDDEN");
  return row;
}
export async function requirePay1Case(db: DB, applicationId: string, active = true) {
  if (!pay1Enabled()) return;
  const admission = await requirePay1Admission(db, active);
  const app = await db.marketApplication.findUniqueOrThrow({ where: { id: applicationId }, include: { applicant: { select: { externalId: true } } } });
  if (app.pay1AdmissionId !== admission.id || !app.applicant.externalId || !admission.actorExternalIds.includes(app.applicant.externalId) || app.createdAt < admission.notBefore || app.createdAt >= admission.expiresAt) throw new AccessError("FORBIDDEN");
}
export async function requirePay1Workspace(db: DB, workspaceId: string, active = true) {
  if (!pay1Enabled()) return;
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { marketApplicationId: true } });
  if (!workspace.marketApplicationId) throw new AccessError("FORBIDDEN");
  await requirePay1Case(db, workspace.marketApplicationId, active);
}
