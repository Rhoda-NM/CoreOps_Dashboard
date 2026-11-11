import "server-only";
import { calculateTax, currentTaxConfiguration, expectedTaxInput } from "./tax";
import { clerkClient } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { Prisma, type SubscriptionRequestType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getCurrentWorkspaceMembership } from "../auth/get-current-workspace";
import { AccessError } from "../authorization/errors";
import { requirePlatform, platformCan, type PlatformPermission } from "./platform-auth";
import { capacity } from "./access";
import { CommercialError, DAY, money, normalizeReference, periodEnd } from "./policy";
import { lifecycleEnforcementEnabled } from "../lifecycle/config";
import { lifecycleNow } from "../lifecycle/clock";
import { requireRenewableLifecycle, synchronizeLifecycle } from "../lifecycle/service";
import { restoreAfterPaidActivation } from "../data-access/restore";
import { requireWorkspaceMarket } from "../market/access";
import { requirePay1Workspace } from "../preview/pay1-admission";
import { pay1Enabled } from "../preview/pay1-config";
const hash = (data: unknown) => createHash("sha256").update(JSON.stringify(data)).digest("hex");
const text = (value: string) => z.string().trim().min(3).max(2000).parse(value);
const key = (value: string) => z.string().min(16).max(100).parse(value);
type TX = Prisma.TransactionClient;
async function ownerTransaction<T>(operation: (tx: TX, member: Awaited<ReturnType<typeof getCurrentWorkspaceMembership>>) => Promise<T>) {
  const context = await getCurrentWorkspaceMembership();
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${context.workspaceId} FOR UPDATE`;
    await requirePay1Workspace(tx, context.workspaceId, false);
    const member = await tx.workspaceMember.findFirst({ where: { id: context.id, userId: context.userId, workspaceId: context.workspaceId, status: "ACTIVE", role: "OWNER" }, include: { user: true, workspace: true } });
    if (!member || member.workspace.activationStatus === "CLOSED") throw new AccessError("FORBIDDEN");
    return operation(tx, member);
  });
}
async function platformTransaction<T>(permission: PlatformPermission, workspaceId: string | null, operation: (tx: TX, admin: Awaited<ReturnType<typeof requirePlatform>>) => Promise<T>) {
  const identity = await requirePlatform(permission);
  if (pay1Enabled() && !workspaceId) throw new AccessError("FORBIDDEN");
  return prisma.$transaction(async tx => {
    if (workspaceId) await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id = ${workspaceId} FOR UPDATE`;
    if (workspaceId) {
      const w = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { marketApplicationId: true } });
      if (w.marketApplicationId) await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${w.marketApplicationId} FOR UPDATE`;
    }
    if (workspaceId) await requirePay1Workspace(tx, workspaceId, false);
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id = ${identity.id} FOR UPDATE`;
    const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: identity.id } });
    if (!admin.active || !platformCan(admin.role, permission)) throw new AccessError("FORBIDDEN");
    return operation(tx, admin);
  });
}
async function audit(tx: TX, actorAdminId: string, action: string, resourceId: string, reason: string, workspaceId?: string, metadata?: Prisma.InputJsonObject) {
  await tx.platformAuditEvent.create({ data: { actorAdminId, action, resourceType: "Commercial", resourceId, reason: text(reason), workspaceId, metadata } });
}
async function ownerAudit(tx: TX, member: { userId: string; workspaceId: string }, action: string, resourceId: string) {
  await tx.auditLog.create({ data: { workspaceId: member.workspaceId, actorUserId: member.userId, action, resourceType: "SubscriptionRequest", resourceId } });
}
export async function publishedOffers() {
  const tax = await currentTaxConfiguration();
  const eligibleTreatments = tax && Array.isArray(tax.allowedTreatments) ? tax.allowedTreatments.filter((t): t is "INCLUSIVE" | "EXCLUSIVE" | "EXEMPT" => typeof t === "string" && ["INCLUSIVE", "EXCLUSIVE", "EXEMPT"].includes(t)) : null;
  return prisma.subscriptionPlanOffer.findMany({ where: { published: true, businessApprovedAt: { not: null }, taxTreatment: eligibleTreatments ? { in: eligibleTreatments } : { not: "UNCONFIRMED" } }, orderBy: [{ plan: "asc" }, { interval: "asc" }, { version: "desc" }] });
}
export async function ownerSubscription() {
  return ownerTransaction(async (tx, member) => ({ workspace: member.workspace, subscription: await tx.subscription.findUnique({ where: { workspaceId: member.workspaceId } }), requests: await tx.subscriptionRequest.findMany({ where: { workspaceId: member.workspaceId }, include: { payments: { include: { receipt: { include: { reversal: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }), periods: await tx.subscriptionPeriod.findMany({ where: { workspaceId: member.workspaceId }, orderBy: { startsAt: "desc" }, take: 50 }) }));
}
export async function submitRequest(offerId: string, type: SubscriptionRequestType, idempotencyKey: string) {
  z.enum(["INITIAL", "RENEWAL", "UPGRADE"]).parse(type); key(idempotencyKey);
  const payloadHash = hash({ offerId, type });
  return ownerTransaction(async (tx, member) => {
    await requireWorkspaceMarket(tx, member.workspaceId);
    const existing = await tx.subscriptionRequest.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: member.workspaceId, idempotencyKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new CommercialError("This request key was already used with different details."); return existing; }
    const offer = await tx.subscriptionPlanOffer.findUniqueOrThrow({ where: { id: offerId } });
    if (!offer.published || !offer.businessApprovedAt || offer.taxTreatment === "UNCONFIRMED") throw new CommercialError("This offer is not approved for subscription requests.");
    const latest = await tx.subscriptionPeriod.findFirst({ where: { workspaceId: member.workspaceId, revokedAt: null }, orderBy: { endsAt: "desc" } });
    if ((type === "INITIAL") === !!latest) throw new CommercialError("Choose the correct initial or renewal request type.");
    if (type === "RENEWAL" && latest && (latest.plan !== offer.plan || latest.interval !== offer.interval)) throw new CommercialError("Renewals must retain the agreed plan and interval. Contact support for a plan change.");
    if (type === "UPGRADE" && latest && planRank(offer.plan) <= planRank(latest.plan)) throw new CommercialError("Only a higher plan can be requested as an upgrade. Downgrades require a separate reviewed policy.");
    const subscription = await tx.subscription.upsert({ where: { workspaceId: member.workspaceId }, update: {}, create: { workspaceId: member.workspaceId, status: "PENDING_ACTIVATION" } });
    const request = await tx.subscriptionRequest.create({ data: { workspaceId: member.workspaceId, subscriptionId: subscription.id, submittedByUserId: member.userId, offerId, type, idempotencyKey, payloadHash, plan: offer.plan, interval: offer.interval, offerVersion: offer.version, catalogAmount: offer.amount, quotedAmount: offer.amount, currency: offer.currency, memberLimit: offer.memberLimit, projectLimit: offer.projectLimit, invitationsEnabled: offer.invitationsEnabled, features: offer.features as Prisma.InputJsonValue, taxTreatment: offer.taxTreatment } });
    await ownerAudit(tx, member, "SUBSCRIPTION_REQUEST_SUBMITTED", request.id);
    return request;
  });
}
export async function reviewRequest(requestId: string, input: { amount: string; tax: string; memberLimit: number; accountId: string; notes: string }) {
  await requirePlatform("billing");
  const initial = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, select: { workspaceId: true } });
  return platformTransaction("billing", initial.workspaceId, async (tx, admin) => {
    await requireWorkspaceMarket(tx, initial.workspaceId);
    const request = await tx.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (request.status !== "SUBMITTED") throw new CommercialError("Only submitted requests may be commercially reviewed.");
    const account = await tx.paymentReceivingAccount.findUniqueOrThrow({ where: { id: input.accountId } });
    if (!account.active || !account.verifiedAt || account.currency !== request.currency || request.taxTreatment === "UNCONFIRMED") throw new CommercialError("A verified receiving account and confirmed tax treatment are required.");
    const amount = money(input.amount);
    const computedTax = calculateTax(amount, request.taxTreatment, await currentTaxConfiguration(tx));
    const tax = computedTax.tax;
    if (!expectedTaxInput(input.tax).equals(tax)) throw new CommercialError("VAT must match the approved configuration exactly. If registration is unverified, VAT must be zero.");
    if (request.catalogAmount && !amount.equals(request.catalogAmount)) throw new CommercialError("Published pricing must be preserved. Create a new offer version for a different price.");
    const memberLimit = z.number().int().positive().max(100000).parse(input.memberLimit);
    if ((request.memberLimit && memberLimit !== request.memberLimit) || (request.plan === "SOLO" && memberLimit !== 1)) throw new CommercialError("Member limit must match the offer snapshot.");
    const result = await tx.subscriptionRequest.update({ where: { id: requestId }, data: { status: "QUOTED", quotedAmount: amount, taxAmount: tax, payableAmount: computedTax.payable, netAmount: computedTax.net, vatRate: computedTax.rate, taxSnapshot: computedTax.snapshot, memberLimit, approvedAt: new Date(), reviewedById: admin.id, reviewNotes: text(input.notes), receivingAccountId: account.id, paymentInstructions: { label: account.label, method: account.method, currency: account.currency, accountIdentifier: account.accountIdentifier, instructions: account.instructions } } });
    await audit(tx, admin.id, "REQUEST_COMMERCIALLY_APPROVED", requestId, input.notes, request.workspaceId);
    return result;
  });
}
export async function acceptQuote(requestId: string) {
  return ownerTransaction(async (tx, member) => {
    await requireWorkspaceMarket(tx, member.workspaceId);
    const request = await tx.subscriptionRequest.findFirstOrThrow({ where: { id: requestId, workspaceId: member.workspaceId } });
    if (request.status === "AWAITING_PAYMENT") return request;
    if (request.status !== "QUOTED" || !request.approvedAt || !request.payableAmount) throw new CommercialError("A commercially approved quote is required.");
    const result = await tx.subscriptionRequest.update({ where: { id: requestId }, data: { status: "AWAITING_PAYMENT", quoteAcceptedAt: new Date() } });
    await ownerAudit(tx, member, "SUBSCRIPTION_QUOTE_ACCEPTED", requestId); return result;
  });
}
export async function submitPayment(requestId: string, input: { reference: string; amount: string; idempotencyKey: string }) {
  const reference = normalizeReference(input.reference), amount = money(input.amount); key(input.idempotencyKey);
  const payloadHash = hash({ reference, amount: amount.toFixed(2) });
  return ownerTransaction(async (tx, member) => {
    await requireWorkspaceMarket(tx, member.workspaceId);
    const request = await tx.subscriptionRequest.findFirstOrThrow({ where: { id: requestId, workspaceId: member.workspaceId } });
    const existing = await tx.subscriptionPayment.findUnique({ where: { requestId_idempotencyKey: { requestId, idempotencyKey: input.idempotencyKey } } });
    if (existing) { if (existing.payloadHash !== payloadHash) throw new CommercialError("This payment key was already used with different details."); return existing; }
    if (request.status !== "AWAITING_PAYMENT" || !request.quoteAcceptedAt || !request.receivingAccountId) throw new CommercialError("Accept a reviewed quote before submitting payment details.");
    const account = await tx.paymentReceivingAccount.findUniqueOrThrow({ where: { id: request.receivingAccountId } });
    if (account.method === "PAYSTACK") throw new CommercialError("Use the approved Paystack checkout; gateway references are verified server-side.");
    if (!account.active || !account.verifiedAt) throw new CommercialError("Payment instructions are under review; contact support before paying.");
    const payment = await tx.subscriptionPayment.create({ data: { workspaceId: member.workspaceId, requestId, receivingAccountId: account.id, method: account.method, currency: request.currency, submittedByUserId: member.userId, proposedAmount: amount, submittedReference: input.reference.trim(), normalizedReference: reference, idempotencyKey: input.idempotencyKey, payloadHash } });
    await ownerAudit(tx, member, "PAYMENT_DETAILS_SUBMITTED", requestId); return payment;
  });
}
async function funding(tx: TX, requestId: string) {
  const receipts = await tx.subscriptionPaymentReceipt.findMany({ where: { requestId, reversal: null } });
  return receipts.reduce((sum, receipt) => sum.add(receipt.amount), new Prisma.Decimal(0));
}
export async function verifyPayment(paymentId: string, input: { amount: string; reference: string; ledgerEntryId: string; receivedAt: string; notes: string }) {
  await requirePlatform("billing");
  const initial = await prisma.subscriptionPayment.findUniqueOrThrow({ where: { id: paymentId }, select: { workspaceId: true } });
  return platformTransaction("billing", initial.workspaceId, async (tx, admin) => {
    const payment = await tx.subscriptionPayment.findUniqueOrThrow({ where: { id: paymentId }, include: { request: true } });
    if (payment.method === "PAYSTACK") throw new CommercialError("Paystack payments must be reconciled against the provider API.");
    if (admin.userId === payment.submittedByUserId) throw new CommercialError("A different administrator must independently verify this payment.");
    const existing = await tx.subscriptionPaymentReceipt.findUnique({ where: { submissionId: paymentId } });
    if (existing) return existing;
    if (payment.status !== "SUBMITTED" || !["AWAITING_PAYMENT", "READY_FOR_ACTIVATION"].includes(payment.request.status)) throw new CommercialError("This payment is not available for verification.");
    z.string().datetime({ offset: true }).parse(input.receivedAt);
    const receivedAt = z.coerce.date().max(new Date()).parse(input.receivedAt);
    const receipt = await tx.subscriptionPaymentReceipt.create({ data: { submissionId: payment.id, workspaceId: payment.workspaceId, requestId: payment.requestId, receivingAccountId: payment.receivingAccountId, method: payment.method, currency: payment.currency, amount: money(input.amount), transactionReference: normalizeReference(input.reference), ledgerEntryId: text(input.ledgerEntryId), receivedAt, verifiedById: admin.id, verificationNotes: text(input.notes), taxSnapshot: payment.request.taxSnapshot as Prisma.InputJsonValue | undefined } });
    await tx.subscriptionPayment.update({ where: { id: paymentId }, data: { status: "RECONCILED", reviewNotes: text(input.notes) } });
    const total = await funding(tx, payment.requestId);
    await tx.subscriptionRequest.update({ where: { id: payment.requestId }, data: { status: total.gte(payment.request.payableAmount!) ? "READY_FOR_ACTIVATION" : "AWAITING_PAYMENT", overpaymentReviewedAt: null, overpaymentReviewedById: null, overpaymentDisposition: null } });
    await audit(tx, admin.id, "PAYMENT_RECEIPT_VERIFIED", receipt.id, input.notes, payment.workspaceId); return receipt;
  });
}
export async function reviewOverpayment(requestId: string, reason: string) {
  await requirePlatform("billing");
  const request = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, select: { workspaceId: true } });
  return platformTransaction("billing", request.workspaceId, async (tx, admin) => {
    const fresh = await tx.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (fresh.status !== "READY_FOR_ACTIVATION" || !(await funding(tx, requestId)).gt(fresh.payableAmount!)) throw new CommercialError("No overpayment is awaiting review.");
    await tx.subscriptionRequest.update({ where: { id: requestId }, data: { overpaymentReviewedAt: new Date(), overpaymentReviewedById: admin.id, overpaymentDisposition: text(reason) } });
    await audit(tx, admin.id, "OVERPAYMENT_REVIEWED", requestId, reason, request.workspaceId);
  });
}
// Single paid activation transaction; no client flag or payer statement can bypass receipt checks.
export async function activateSubscription(requestId: string, reason: string, recoveryRequestId?: string) {
  await requirePlatform("activate");
  const initial = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, select: { workspaceId: true } });
  const priorActivation = await prisma.subscriptionPeriod.findUnique({ where: { sourceRequestId: requestId } });
  if (priorActivation) { await requireWorkspaceMarket(prisma, initial.workspaceId); return priorActivation; }
  const recoveryTarget = recoveryRequestId ? await prisma.workspaceRecoveryRequest.findFirstOrThrow({ where: { id: recoveryRequestId, workspaceId: initial.workspaceId }, select: { requesterId: true } }) : null;
  const verifiedOwner = await verifyWorkspaceOwner(initial.workspaceId, recoveryTarget?.requesterId);
  return platformTransaction("activate", initial.workspaceId, async (tx, admin) => {
    const marketEligibility = await requireWorkspaceMarket(tx, initial.workspaceId);
    const existing = await tx.subscriptionPeriod.findUnique({ where: { sourceRequestId: requestId } });
    if (existing) return existing;
    const request = await tx.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, include: { workspace: true } });
    if (request.workspace.activationStatus === "SUSPENDED") throw new CommercialError("A suspended workspace requires an authorized restriction review before activation.");
    if (request.workspace.activationStatus === "CLOSED" || request.status !== "READY_FOR_ACTIVATION" || !request.approvedAt || !request.quoteAcceptedAt || !request.payableAmount || !request.memberLimit) throw new CommercialError("Commercial approval, accepted quote, and verified payment are required.");
    if (await tx.subscriptionPayment.count({ where: { requestId, status: "SUBMITTED" } })) throw new CommercialError("Reconcile or reject every submitted payment claim before activation.");
    const total = await funding(tx, requestId);
    if (total.lt(request.payableAmount) || (total.gt(request.payableAmount) && !request.overpaymentReviewedAt)) throw new CommercialError("Verified funds must cover the quote; overpayments require reconciliation review.");
    const owners = await tx.workspaceMember.count({ where: { id: verifiedOwner.memberId, workspaceId: request.workspaceId, role: "OWNER", status: "ACTIVE", user: { externalId: verifiedOwner.externalId, email: verifiedOwner.email } } });
    if (!owners || await capacity(request.workspaceId, tx) > request.memberLimit) throw new CommercialError("An active owner and sufficient member capacity are required.");
    if (request.plan === "SOLO" && (await tx.workspaceMember.count({ where: { workspaceId: request.workspaceId, role: { not: "OWNER" } } }) || request.invitationsEnabled)) throw new CommercialError("Solo allows one owner and no invitations.");
    const now = await lifecycleNow(tx);
    const recovery = await requireRenewableLifecycle(tx, request.workspaceId, now, recoveryRequestId ? { requestId: recoveryRequestId, ownerMemberId: verifiedOwner.memberId } : undefined);
    if (lifecycleEnforcementEnabled()) await synchronizeLifecycle(tx, request.workspaceId, now);
    const previous = await tx.subscriptionPeriod.findFirst({ where: { workspaceId: request.workspaceId, revokedAt: null }, orderBy: { endsAt: "desc" } });
    if ((request.type === "INITIAL") === !!previous) throw new CommercialError("The subscription history changed; review a new request.");
    if (previous && request.type === "RENEWAL" && (request.plan !== previous.plan || request.interval !== previous.interval)) throw new CommercialError("Renewals cannot change plans or billing intervals.");
    if (request.type === "UPGRADE" && (process.env.COREOPS_PLAN_UPGRADE_POLICY !== "NEXT_PAID_PERIOD" || !previous || planRank(request.plan) <= planRank(previous.plan) || request.memberLimit < previous.memberLimit)) throw new CommercialError("Upgrade activation requires the approved NEXT_PAID_PERIOD policy and a higher eligible plan. Current entitlements remain unchanged.");
    const startsAt = previous && previous.endsAt > now ? previous.endsAt : now;
    const anchorDay = previous && previous.endsAt > now ? previous.anchorDay : startsAt.getUTCDate();
    const endsAt = periodEnd(startsAt, request.interval, anchorDay), graceEndsAt = new Date(endsAt.getTime() + 7 * DAY);
    const period = await tx.subscriptionPeriod.create({ data: { workspaceId: request.workspaceId, subscriptionId: request.subscriptionId, sourceRequestId: request.id, plan: request.plan, interval: request.interval, startsAt, endsAt, graceEndsAt, anchorDay, memberLimit: request.memberLimit, projectLimit: request.projectLimit, invitationsEnabled: request.invitationsEnabled, features: request.features as Prisma.InputJsonValue, agreedAmount: request.payableAmount, currency: request.currency, activatedById: admin.id } });
    await tx.subscription.update({ where: { id: request.subscriptionId }, data: { plan: request.plan, status: "ACTIVE", currentPeriodEnd: endsAt, gracePeriodEnd: graceEndsAt } });
    await tx.workspace.update({ where: { id: request.workspaceId }, data: { activationStatus: "ACTIVE", activatedAt: request.workspace.activatedAt ?? now } });
    await tx.subscriptionRequest.update({ where: { id: requestId }, data: { status: "ACTIVATED" } });
    if (recovery) await restoreAfterPaidActivation(tx, recovery, period);
    else if (lifecycleEnforcementEnabled()) await synchronizeLifecycle(tx, request.workspaceId, now);
    await audit(tx, admin.id, "SUBSCRIPTION_ACTIVATED", period.id, reason, request.workspaceId, { requestId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), ...(marketEligibility ? { marketApplicationId: marketEligibility.id, marketDecisionId: marketEligibility.currentDecisionId, marketSubmissionId: marketEligibility.operativeSubmissionId } : {}) }); return period;
  });
}
export async function rejectPayment(paymentId: string, reason: string) {
  await requirePlatform("billing");
  const initial = await prisma.subscriptionPayment.findUniqueOrThrow({ where: { id: paymentId }, select: { workspaceId: true } });
  return platformTransaction("billing", initial.workspaceId, async (tx, admin) => {
    const result = await tx.subscriptionPayment.updateMany({ where: { id: paymentId, status: "SUBMITTED", receipt: null }, data: { status: "REJECTED", reviewNotes: text(reason) } });
    if (!result.count) throw new CommercialError("Only unverified submissions can be rejected.");
    await audit(tx, admin.id, "PAYMENT_SUBMISSION_REJECTED", paymentId, reason, initial.workspaceId);
  });
}
export async function reverseReceipt(receiptId: string, reason: string) {
  await requirePlatform("activate");
  const initial = await prisma.subscriptionPaymentReceipt.findUniqueOrThrow({ where: { id: receiptId }, select: { workspaceId: true } });
  return platformTransaction("activate", initial.workspaceId, async (tx, admin) => {
    const receipt = await tx.subscriptionPaymentReceipt.findUniqueOrThrow({ where: { id: receiptId }, include: { reversal: true } });
    if (receipt.reversal) return receipt.reversal;
    const result = await tx.subscriptionPaymentReversal.create({ data: { receiptId, actorAdminId: admin.id, reason: text(reason) } });
    const period = await tx.subscriptionPeriod.findUnique({ where: { sourceRequestId: receipt.requestId } });
    if (period) {
      await tx.subscriptionPeriod.update({ where: { id: period.id }, data: { revokedAt: new Date() } });
      await tx.workspace.update({ where: { id: initial.workspaceId }, data: { activationStatus: "SUSPENDED" } });
      const remaining = await tx.subscriptionPeriod.findFirst({ where: { workspaceId: initial.workspaceId, revokedAt: null }, orderBy: { endsAt: "desc" } });
      await tx.subscription.update({ where: { workspaceId: initial.workspaceId }, data: { status: "SUSPENDED", currentPeriodEnd: remaining?.endsAt ?? null, gracePeriodEnd: remaining?.graceEndsAt ?? null, ...(remaining ? { plan: remaining.plan } : {}) } });
    } else await tx.subscriptionRequest.update({ where: { id: receipt.requestId }, data: { status: "AWAITING_PAYMENT", overpaymentReviewedAt: null, overpaymentReviewedById: null, overpaymentDisposition: null } });
    await audit(tx, admin.id, "PAYMENT_RECEIPT_REVERSED", receiptId, reason, initial.workspaceId); return result;
  });
}
export async function setWorkspaceStatus(workspaceId: string, status: "ACTIVE" | "SUSPENDED" | "CLOSED", reason: string) {
  z.enum(["ACTIVE", "SUSPENDED", "CLOSED"]).parse(status);
  await requirePlatform("activate");
  const verifiedOwner = status === "ACTIVE" ? await verifyWorkspaceOwner(workspaceId) : null;
  return platformTransaction("activate", workspaceId, async (tx, admin) => {
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    if (workspace.activationStatus === "CLOSED" || workspace.activationStatus === "PENDING_ACTIVATION") throw new CommercialError("Use the paid activation workflow for pending workspaces. Closed workspaces require a separate recovery review.");
    if (status === "ACTIVE") {
      await requireWorkspaceMarket(tx, workspaceId);
      await requireRenewableLifecycle(tx, workspaceId, await lifecycleNow(tx));
      const period = await tx.subscriptionPeriod.findFirst({ where: { workspaceId, revokedAt: null, startsAt: { lte: new Date() }, graceEndsAt: { gt: new Date() } } });
      if (!period || !verifiedOwner || !await tx.workspaceMember.count({ where: { id: verifiedOwner.memberId, workspaceId, role: "OWNER", status: "ACTIVE", user: { externalId: verifiedOwner.externalId, email: verifiedOwner.email } } })) throw new CommercialError("Reactivation requires an eligible paid period and active owner.");
    }
    await tx.workspace.update({ where: { id: workspaceId }, data: { activationStatus: status } });
    await tx.subscription.update({ where: { workspaceId }, data: { status: status === "ACTIVE" ? "ACTIVE" : "SUSPENDED" } });
    await audit(tx, admin.id, `WORKSPACE_${status}`, workspaceId, reason, workspaceId);
  });
}
export async function closeRequest(requestId: string, reject: boolean, reason: string) {
  await requirePlatform("billing");
  const initial = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, select: { workspaceId: true } });
  return platformTransaction("billing", initial.workspaceId, async (tx, admin) => {
    const request = await tx.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (!["SUBMITTED", "QUOTED", "AWAITING_PAYMENT", "READY_FOR_ACTIVATION"].includes(request.status) || (await funding(tx, requestId)).gt(0)) throw new CommercialError("Funded or terminal requests require reconciliation before closure.");
    await tx.subscriptionRequest.update({ where: { id: requestId }, data: { status: reject ? "REJECTED" : "CANCELLED" } });
    await audit(tx, admin.id, "REQUEST_CLOSED", requestId, reason, request.workspaceId);
  });
}
export async function createOffer(input: { plan: string; interval: string; version: number; name: string; amount: string; memberLimit: number | null; projectLimit: number | null; invitationsEnabled: boolean; taxTreatment: string; features: Record<string, boolean> }) {
  const plan = z.enum(["SOLO", "STARTER", "BUSINESS", "ENTERPRISE"]).parse(input.plan);
  const interval = z.enum(["MONTHLY", "ANNUAL"]).parse(input.interval);
  const taxTreatment = z.enum(["UNCONFIRMED", "INCLUSIVE", "EXCLUSIVE", "EXEMPT"]).parse(input.taxTreatment);
  const features = z.object({ clients: z.boolean(), projects: z.boolean(), tasks: z.boolean(), invoices: z.boolean(), dashboard: z.boolean() }).strict().parse(input.features);
  if (plan === "SOLO" && Object.values(features).some(enabled => !enabled)) throw new CommercialError("Solo must include clients, projects, tasks, invoices, and the basic dashboard.");
  const memberLimit = input.memberLimit === null && plan === "ENTERPRISE" ? null : z.number().int().positive().max(100000).parse(input.memberLimit);
  if ((plan === "SOLO" && (memberLimit !== 1 || input.invitationsEnabled)) || (plan === "STARTER" && memberLimit !== 3) || (plan === "BUSINESS" && memberLimit !== 10)) throw new CommercialError("Member allowance does not match the plan policy.");
  return platformTransaction("catalog", null, async (tx, admin) => {
    const offer = await tx.subscriptionPlanOffer.create({ data: { plan, interval, version: z.number().int().positive().parse(input.version), name: text(input.name), amount: input.amount ? money(input.amount) : null, memberLimit, projectLimit: input.projectLimit === null ? null : z.number().int().positive().parse(input.projectLimit), invitationsEnabled: input.invitationsEnabled, features, taxTreatment } });
    await audit(tx, admin.id, "OFFER_DRAFT_CREATED", offer.id, "New unpublished offer version"); return offer;
  });
}
export async function publishOffer(offerId: string, approvalReference: string, published: boolean) {
  return platformTransaction("catalog", null, async (tx, admin) => {
    await tx.$queryRaw`SELECT id FROM "SubscriptionPlanOffer" WHERE id = ${offerId} FOR UPDATE`;
    const offer = await tx.subscriptionPlanOffer.findUniqueOrThrow({ where: { id: offerId } });
    if (published && (offer.taxTreatment === "UNCONFIRMED" || (!offer.amount && offer.plan !== "ENTERPRISE"))) throw new CommercialError("Confirm tax treatment and pricing in a new offer version before publishing.");
    const result = await tx.subscriptionPlanOffer.update({ where: { id: offerId }, data: { published, ...(!offer.businessApprovedAt && published ? { businessApprovedAt: new Date(), businessApprovalRef: text(approvalReference), approvedById: admin.id } : {}) } });
    await audit(tx, admin.id, published ? "OFFER_PUBLISHED" : "OFFER_WITHDRAWN", offerId, approvalReference); return result;
  });
}
export async function registerReceivingAccount(input: { label: string; method: string; accountIdentifier: string; instructions: string; approval: string }) {
  const method = z.enum(["MPESA", "BANK"]).parse(input.method);
  return platformTransaction("catalog", null, async (tx, admin) => {
    const account = await tx.paymentReceivingAccount.create({ data: { label: text(input.label), method, accountIdentifier: text(input.accountIdentifier), instructions: text(input.instructions), active: true, verifiedAt: new Date(), verifiedById: admin.id } });
    await audit(tx, admin.id, "RECEIVING_ACCOUNT_VERIFIED", account.id, input.approval); return account;
  });
}
export async function platformDirectory() {
  await requirePlatform("directory");
  return prisma.workspace.findMany({ select: { id: true, name: true, slug: true, activationStatus: true, createdAt: true, subscription: { select: { status: true, plan: true, currentPeriodEnd: true, gracePeriodEnd: true } }, _count: { select: { members: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
}
export async function platformRequests() {
  await requirePlatform("billing");
  return prisma.subscriptionRequest.findMany({ include: { workspace: { select: { name: true } }, payments: { include: { receipt: { include: { reversal: true } } } }, period: true }, orderBy: { createdAt: "desc" }, take: 100 });
}
export async function platformHistory() {
  await requirePlatform("billing");
  return prisma.subscriptionPeriod.findMany({ orderBy: { startsAt: "desc" }, take: 100 });
}
export async function platformOffers() {
  await requirePlatform("catalog");
  return { offers: await prisma.subscriptionPlanOffer.findMany({ orderBy: [{ plan: "asc" }, { version: "desc" }] }), accounts: await prisma.paymentReceivingAccount.findMany({ orderBy: { createdAt: "desc" }, take: 100 }) };
}
export async function platformAuditHistory() {
  const admin = await requirePlatform("audit");
  // Support can see event classification and time, never commercial notes or payer data.
  return prisma.platformAuditEvent.findMany({ select: { id: true, action: true, resourceId: true, workspaceId: true, createdAt: true, ...(admin.role !== "SUPPORT" ? { reason: true, actorAdminId: true } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
}
export async function renameOnboardingWorkspace(name: string) {
  return ownerTransaction(async (tx, member) => {
    const updated = await tx.workspace.update({ where: { id: member.workspaceId }, data: { name: z.string().trim().min(2).max(120).parse(name) } });
    await ownerAudit(tx, member, "WORKSPACE_RENAMED", member.workspaceId); return updated;
  });
}

function planRank(plan: string) { return ["SOLO", "STARTER", "BUSINESS", "ENTERPRISE"].indexOf(plan); }
export async function platformMetrics() {
  const admin = await requirePlatform("directory"), now = new Date(), fortnight = new Date(now.getTime() + 14 * DAY);
  const [active, pending, expiring, expired, pendingRequests] = await Promise.all([
    prisma.workspace.count({ where: { activationStatus: "ACTIVE", subscriptionPeriods: { some: { revokedAt: null, startsAt: { lte: now }, endsAt: { gt: now } } } } }),
    prisma.workspace.count({ where: { activationStatus: "PENDING_ACTIVATION" } }),
    prisma.subscription.count({ where: { currentPeriodEnd: { gte: now, lte: fortnight }, workspace: { activationStatus: "ACTIVE" } } }),
    prisma.subscription.count({ where: { currentPeriodEnd: { lt: now } } }),
    platformCan(admin.role, "billing") ? prisma.subscriptionRequest.count({ where: { status: { in: ["SUBMITTED", "QUOTED", "AWAITING_PAYMENT", "READY_FOR_ACTIVATION"] } } }) : Promise.resolve(null),
  ]);
  return { active, pending, expiring, expired, pendingRequests };
}

async function verifyWorkspaceOwner(workspaceId: string, userId?: string) {
  const candidates = await prisma.workspaceMember.findMany({ where: { workspaceId, ...(userId ? { userId } : {}), role: "OWNER", status: "ACTIVE", user: { externalId: { not: null } } }, select: { id: true, user: { select: { externalId: true, email: true } } }, take: 10 });
  const client = await clerkClient();
  for (const candidate of candidates) {
    try {
      const profile = await client.users.getUser(candidate.user.externalId!);
      const email = profile.emailAddresses.find(e => e.id === profile.primaryEmailAddressId);
      if (!profile.banned && !profile.locked && profile.id === candidate.user.externalId && email?.verification?.status === "verified" && email.emailAddress.toLowerCase() === candidate.user.email.toLowerCase()) return { memberId: candidate.id, externalId: profile.id, email: candidate.user.email };
    } catch { /* Fail closed; never log identity-provider details. */ }
  }
  throw new CommercialError("An active owner with a current verified identity is required. Review owner account recovery before activation.");
}
