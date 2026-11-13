import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getCurrentUser } from "../auth/get-current-user";
import { requireCentralHost } from "../routing/request-context";
import { requirePlatform } from "../commercial/platform-auth";
import { AccessError } from "../authorization/errors";
import { requireMarketRehearsal } from "./config";
import { pay1Enabled } from "../preview/pay1-config";
import { requirePay1Actor, requirePay1Case } from "../preview/pay1-admission";
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const key = z.string().min(16).max(100);
export const countryCodes = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
const country = z.string().refine(v => countryCodes.includes(v), "Select a business country");
const input = z.object({ country, interest: z.enum(["WORKFLOW", "PROJECTS", "INVOICING"]), useCase: z.string().trim().min(3).max(1000), attested: z.literal(true), idempotencyKey: key, applicationId: z.string().optional(), expectedRevision: z.number().int().nonnegative().optional() });
export async function submitMarketApplication(value: z.input<typeof input>) {
  requireMarketRehearsal(); await requireCentralHost(); const actor = await getCurrentUser(); const data = input.parse(value);
  const payloadHash = digest({ country: data.country, interest: data.interest, useCase: data.useCase, applicationId: data.applicationId ?? null, attested: true });
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    const admission = await requirePay1Actor(actor.externalId!, tx);
    const identity = await tx.user.findUniqueOrThrow({ where: { id: actor.id }, select: { externalId: true, email: true, platformSuspended: true } });
    if (identity.platformSuspended || identity.externalId !== actor.externalId || identity.email !== actor.email) throw new AccessError("FORBIDDEN");
    const old = await tx.marketSubmission.findUnique({ where: { applicantUserId_idempotencyKey: { applicantUserId: actor.id, idempotencyKey: data.idempotencyKey } } });
    if (old) { await requirePay1Case(tx, old.applicationId); if (old.payloadHash !== payloadHash) throw new AccessError("CONFLICT"); return tx.marketApplication.findUniqueOrThrow({ where: { id: old.applicationId } }); }
    if (await tx.marketSubmission.count({ where: { applicantUserId: actor.id, attestedAt: { gt: new Date(Date.now() - 3600000) } } }) >= 10) throw new AccessError("FORBIDDEN");
    const policy = await tx.marketPolicy.findFirstOrThrow({ orderBy: { revision: "desc" } });
    let app = data.applicationId ? await tx.marketApplication.findFirstOrThrow({ where: { id: data.applicationId, applicantUserId: actor.id } }) : null;
    if (app) {
      await requirePay1Case(tx, app.id);
      await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${app.id} FOR UPDATE`;
      app = await tx.marketApplication.findUniqueOrThrow({ where: { id: app.id } });
      if (["REVOKED", "REJECTED", "WITHDRAWN"].includes(app.state)) throw new AccessError("CONFLICT");
      // Bound-business change/continuity policy remains unresolved: never replace its approval.
      if (await tx.workspace.count({ where: { marketApplicationId: app.id } }) || data.expectedRevision !== app.revision) throw new AccessError("CONFLICT");
    } else {
      if (await tx.marketApplication.count({ where: { applicantUserId: actor.id, state: { in: ["SUBMITTED", "APPROVED", "DEFERRED"] } } }) >= 5) throw new AccessError("FORBIDDEN");
      app = await tx.marketApplication.create({ data: { applicantUserId: actor.id, ...(admission ? { pay1AdmissionId: admission.id } : {}) } });
    }
    const submission = await tx.marketSubmission.create({ data: { applicationId: app.id, applicantUserId: actor.id, revision: app.revision + 1, policyId: policy.id, country: data.country, interest: data.interest, useCase: data.useCase, idempotencyKey: data.idempotencyKey, payloadHash } });
    const rules = policy.countries as Record<string, string>;
    const configuredAvailability = rules[data.country] ?? policy.defaultAvailability;
    // PAY-1 cannot widen OPEN markets through a prospective policy change.
    const availability = pay1Enabled() && data.country !== "KE" && configuredAvailability === "OPEN" ? "REVIEW_REQUIRED" : configuredAvailability;
    const decision = availability === "OPEN" ? await tx.marketDecision.create({ data: { applicationId: app.id, submissionId: submission.id, type: "OPEN_POLICY", applicationRevision: app.revision, actorUserId: actor.id, reason: "SELF_DECLARED_OPEN_MARKET", operationKey: `${submission.id}:OPEN_POLICY`, payloadHash } }) : null;
    return tx.marketApplication.update({ where: { id: app.id }, data: { latestSubmissionId: submission.id, operativeSubmissionId: decision ? submission.id : null, currentDecisionId: decision?.id ?? null, state: availability === "OPEN" ? "APPROVED" : availability === "UNAVAILABLE" ? "REJECTED" : "SUBMITTED", revision: { increment: 1 } } });
  });
}
export async function reviewMarketApplication(id: string, data: { type: "APPROVE" | "DEFER" | "REJECT" | "REVOKE"; expectedRevision: number; reason: string; operationKey: string; validUntil?: string }) {
  requireMarketRehearsal();
  if (pay1Enabled() && data.type === "APPROVE") throw new AccessError("FORBIDDEN");
  const admin = await requirePlatform("activate");
  z.enum(["APPROVE", "DEFER", "REJECT", "REVOKE"]).parse(data.type); key.parse(data.operationKey); z.string().trim().min(3).max(1000).parse(data.reason);
  const expiry = data.validUntil ? z.coerce.date().parse(data.validUntil) : null;
  const payloadHash = digest({ id, ...data });
  const initial = await prisma.workspace.findUnique({ where: { marketApplicationId: id }, select: { id: true } });
  return prisma.$transaction(async tx => {
    if (initial) await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${initial.id} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${id} FOR UPDATE`;
    const bound = await tx.workspace.findUnique({ where: { marketApplicationId: id }, select: { id: true } });
    if ((bound?.id ?? null) !== (initial?.id ?? null)) throw new AccessError("CONFLICT");
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
    const fresh = await tx.platformAdmin.findUniqueOrThrow({ where: { id: admin.id } });
    await requirePay1Case(tx, id);
    const app = await tx.marketApplication.findUniqueOrThrow({ where: { id } });
    if (!fresh.active || fresh.role !== "SUPER_ADMIN" || fresh.userId === app.applicantUserId || (bound && await tx.workspaceMember.count({ where: { workspaceId: bound.id, userId: fresh.userId } }))) throw new AccessError("FORBIDDEN");
    const replay = await tx.marketDecision.findUnique({ where: { operationKey: data.operationKey } });
    if (replay) { if (replay.payloadHash !== payloadHash || replay.applicationId !== id) throw new AccessError("CONFLICT"); return { id: replay.id }; }
    if (!app.latestSubmissionId || app.revision !== data.expectedRevision) throw new AccessError("CONFLICT");
    const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const submission = await tx.marketSubmission.findUniqueOrThrow({ where: { id: app.latestSubmissionId }, include: { policy: true } });
    const availability = (submission.policy.countries as Record<string, string>)[submission.country] ?? submission.policy.defaultAvailability;
    if (data.type === "APPROVE" && (availability !== "REVIEW_REQUIRED" || !expiry || expiry <= now || !["SUBMITTED", "DEFERRED"].includes(app.state))) throw new AccessError("FORBIDDEN");
    if (data.type === "REVOKE" && app.state !== "APPROVED") throw new AccessError("CONFLICT");
    if (["DEFER", "REJECT"].includes(data.type) && !["SUBMITTED", "DEFERRED"].includes(app.state)) throw new AccessError("CONFLICT");
    const decision = await tx.marketDecision.create({ data: { applicationId: id, submissionId: submission.id, type: data.type, applicationRevision: app.revision, actorUserId: fresh.userId, reviewerAdminId: fresh.id, reason: data.reason, effectiveAt: now, validUntil: data.type === "APPROVE" ? expiry : null, operationKey: data.operationKey, payloadHash } });
    await tx.marketApplication.update({ where: { id }, data: { state: { APPROVE: "APPROVED", DEFER: "DEFERRED", REJECT: "REJECTED", REVOKE: "REVOKED" }[data.type] as "APPROVED" | "DEFERRED" | "REJECTED" | "REVOKED", currentDecisionId: decision.id, operativeSubmissionId: data.type === "APPROVE" ? submission.id : null, revision: { increment: 1 } } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: fresh.id, workspaceId: bound?.id, action: `MARKET_${data.type}`, resourceType: "MarketApplication", resourceId: id, reason: data.reason, metadata: { decisionId: decision.id } } });
    return { id: decision.id };
  });
}
export async function ownMarketApplications() {
  requireMarketRehearsal(); await requireCentralHost(); const actor = await getCurrentUser();
  const admission = await requirePay1Actor(actor.externalId!);
  const rows = await prisma.marketApplication.findMany({ where: { applicantUserId: actor.id, ...(admission ? { pay1AdmissionId: admission.id } : {}) }, include: { submissions: { orderBy: { revision: "desc" }, take: 1 }, workspace: { select: { slug: true } } }, orderBy: { createdAt: "desc" }, take: 25 });
  const decisions = await prisma.marketDecision.findMany({ where: { id: { in: rows.flatMap(row => row.currentDecisionId ? [row.currentDecisionId] : []) } }, select: { id: true, type: true, validUntil: true } });
  const byId = new Map(decisions.map(decision => [decision.id, decision]));
  const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return rows.map(row => {
    const current = row.currentDecisionId ? byId.get(row.currentDecisionId) : undefined;
    return { ...row, decisions: current ? [current] : [], effectiveState: row.state === "APPROVED" && current?.validUntil && current.validUntil <= now ? "EXPIRED" : row.state };
  });
}
export async function configureMarketPolicy(data: { version: string; countries: Record<string, "OPEN" | "REVIEW_REQUIRED" | "UNAVAILABLE">; reason: string }) {
  requireMarketRehearsal();
  if (pay1Enabled()) throw new AccessError("FORBIDDEN");
  const admin = await requirePlatform("activate");
  z.string().regex(/^[A-Z0-9-]{3,80}$/).parse(data.version); z.string().trim().min(3).max(1000).parse(data.reason);
  for (const [code, availability] of Object.entries(data.countries)) { country.parse(code); z.enum(["OPEN", "REVIEW_REQUIRED", "UNAVAILABLE"]).parse(availability); }
  if (Object.keys(data.countries).length > countryCodes.length) throw new AccessError("FORBIDDEN");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(775411)::text`;
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${admin.id} FOR UPDATE`;
    const fresh = await tx.platformAdmin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!fresh.active || fresh.role !== "SUPER_ADMIN") throw new AccessError("FORBIDDEN");
    const latest = await tx.marketPolicy.findFirstOrThrow({ orderBy: { revision: "desc" } });
    const policy = await tx.marketPolicy.create({ data: { id: data.version, revision: latest.revision + 1, countries: data.countries, defaultAvailability: "REVIEW_REQUIRED" } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: fresh.id, action: "MARKET_POLICY_CREATED", resourceType: "MarketPolicy", resourceId: policy.id, reason: data.reason } });
    return policy;
  });
}
export async function withdrawMarketApplication(id: string, expectedRevision: number, operationKey: string) {
  requireMarketRehearsal(); await requireCentralHost(); const actor = await getCurrentUser(); key.parse(operationKey);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} FOR UPDATE`;
    const identity = await tx.user.findUniqueOrThrow({ where: { id: actor.id }, select: { externalId: true, email: true, platformSuspended: true } });
    if (identity.platformSuspended || identity.externalId !== actor.externalId || identity.email !== actor.email) throw new AccessError("FORBIDDEN");
    await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${id} FOR UPDATE`;
    await requirePay1Actor(actor.externalId!, tx);
    await requirePay1Case(tx, id);
    const app = await tx.marketApplication.findFirstOrThrow({ where: { id, applicantUserId: actor.id } });
    const payloadHash = digest({ id, expectedRevision, type: "WITHDRAW" });
    const prior = await tx.marketDecision.findUnique({ where: { operationKey } });
    if (prior) { if (prior.applicationId !== id || prior.actorUserId !== actor.id || prior.payloadHash !== payloadHash) throw new AccessError("CONFLICT"); return; }
    if (!app.latestSubmissionId || app.revision !== expectedRevision || await tx.workspace.count({ where: { marketApplicationId: id } })) throw new AccessError("CONFLICT");
    const decision = await tx.marketDecision.create({ data: { applicationId: id, submissionId: app.latestSubmissionId, type: "WITHDRAW", applicationRevision: app.revision, actorUserId: actor.id, reason: "APPLICANT_WITHDRAWAL", operationKey, payloadHash } });
    await tx.marketApplication.update({ where: { id }, data: { state: "WITHDRAWN", currentDecisionId: decision.id, operativeSubmissionId: null, revision: { increment: 1 } } });
  });
}
