import "server-only";
import { Prisma, type Pay1PreviewAdmission } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AccessError } from "../authorization/errors";
import { Pay1AdmissionError } from "./pay1-error";
import { pay1Enabled, pay1Target } from "./pay1-config";
type DB = Prisma.TransactionClient;

// Expiry/revocation deny new use. Reconciliation can retain authenticated money
// evidence for this exact admitted case after its test window closes.
export async function requirePay1Admission(db: DB = prisma, active = true) {
  const target = pay1Target();
  let row: Pay1PreviewAdmission | null;
  let now: Date;
  try {
    await db.$queryRaw`SELECT id FROM "Pay1PreviewAdmission" WHERE id=${target.id} FOR SHARE`;
    row = await db.pay1PreviewAdmission.findUnique({ where: { id: target.id } });
    [{ now }] = await db.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  } catch (error) {
    const missingSchema = error instanceof Prisma.PrismaClientKnownRequestError && (
      ["P2021", "P2022"].includes(error.code) ||
      (error.code === "P2010" && ["42P01", "42703"].includes(String(error.meta?.code)))
    );
    throw new Pay1AdmissionError(missingSchema ? "PAY1_SCHEMA_REQUIRED" : "PAY1_ADMISSION_UNAVAILABLE");
  }
  if (!(now instanceof Date) || !Number.isFinite(+now)) throw new Pay1AdmissionError("PAY1_ADMISSION_UNAVAILABLE");
  if (!row) throw new Pay1AdmissionError("PAY1_ADMISSION_REQUIRED");
  if (row.id !== target.id || row.projectId !== target.projectId || row.deploymentId !== target.deploymentId || row.origin !== target.origin || row.databaseHost !== target.databaseHost || row.databaseName !== target.databaseName || row.clerkHost !== target.clerkHost || !row.syntheticOnly || !row.approvalReference) throw new Pay1AdmissionError("PAY1_TARGET_MISMATCH");
  if (active && (row.revokedAt || now < row.notBefore || now >= row.expiresAt)) throw new Pay1AdmissionError("PAY1_WINDOW_CLOSED");
  return row;
}
export async function requirePay1Actor(externalId: string, db: DB = prisma) {
  if (!pay1Enabled()) return null;
  const row = await requirePay1Admission(db);
  if (!row.actorExternalIds.includes(externalId)) throw new Pay1AdmissionError("PAY1_ACTOR_NOT_ADMITTED");
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
