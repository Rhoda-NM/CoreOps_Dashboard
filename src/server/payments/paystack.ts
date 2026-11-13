import "server-only";
import { stagingRequested } from "../staging/config";
import { requireStagingEnvironment } from "../staging/environment";
import { commercialAccess } from "../commercial/access";
import { activateStandardPayment } from "../commercial/standard";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUser } from "../auth/get-current-user";
import { requireCentralHost } from "../routing/request-context";
import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { getCurrentWorkspaceMembership } from "../auth/get-current-workspace";
import { requirePlatform } from "../commercial/platform-auth";
import { CommercialError } from "../commercial/policy";
import { paystackConfig, type GatewayMode } from "./paystack-config";
import { verifyPaystackSignature } from "./paystack-signature";

import { requirePay1Workspace, requirePay1Admission } from "../preview/pay1-admission";
import { pay1Enabled } from "../preview/pay1-config";
import { requireWorkspaceMarket } from "../market/access";

async function api(config: ReturnType<typeof paystackConfig>, endpoint: string, body?: unknown) {
  const response = await fetch(`https://api.paystack.co/${endpoint}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${config.secret}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new CommercialError("Payment provider is temporarily unavailable. Reconcile the existing reference before trying again.");
  const result = await response.json();
  if (result.status !== true || !result.data || typeof result.data !== "object") throw new CommercialError("The payment provider did not confirm this operation.");
  return result.data;
}
export async function initializePaystack(requestId: string, idempotencyKey: string, mode: GatewayMode) {
  z.string().min(16).max(100).parse(idempotencyKey);
  const actor = await getCurrentWorkspaceMembership();
  const config = paystackConfig(mode, true);
  const prepared = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${actor.workspaceId} FOR UPDATE`;
    await requireWorkspaceMarket(tx, actor.workspaceId);
    const owner = await tx.workspaceMember.findFirst({ where: { id: actor.id, userId: actor.userId, workspaceId: actor.workspaceId, status: "ACTIVE", role: "OWNER", user: { platformSuspended: false }, workspace: { activationStatus: { not: "CLOSED" } } } });
    if (!owner) throw new CommercialError("Only an active workspace owner can initialize payment.");
    const request = await tx.subscriptionRequest.findFirstOrThrow({ where: { id: requestId, workspaceId: actor.workspaceId }, include: { receivingAccount: true } });
    const existing = await tx.paystackAttempt.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: actor.workspaceId, idempotencyKey } } });
    if (existing) {
      if (existing.requestId !== requestId || existing.mode !== mode || existing.keyFingerprint !== config.keyFingerprint) throw new CommercialError("The payment key is already bound to a different request or merchant.");
      return existing;
    }
    if (request.status !== "AWAITING_PAYMENT" || !request.quoteAcceptedAt || !request.approvedAt || !request.payableAmount || !request.taxSnapshot || request.currency !== config.currency || !request.receivingAccount?.active || !request.receivingAccount.verifiedAt || request.receivingAccount.method !== "PAYSTACK" || request.receivingAccount.accountIdentifier !== `paystack:${mode}:${config.merchantId}`) throw new CommercialError("An accepted quote and verified matching Paystack merchant account are required.");
    if (await tx.subscriptionPayment.count({ where: { requestId, status: { in: ["SUBMITTED", "RECONCILED"] } } })) throw new CommercialError("Reconcile existing payment claims before creating a checkout. Partial manual and gateway payments are not combined in checkout.");
    const minor = request.payableAmount.mul(100);
    if (!minor.isInteger() || minor.gt(Number.MAX_SAFE_INTEGER)) throw new CommercialError("The payable amount is outside supported gateway limits.");
    const reference = `coreops-${mode}-${randomUUID()}`;
    const payment = await tx.subscriptionPayment.create({ data: { workspaceId: actor.workspaceId, requestId, receivingAccountId: request.receivingAccount.id, method: "PAYSTACK", currency: request.currency, submittedByUserId: actor.userId, proposedAmount: request.payableAmount, submittedReference: reference, normalizedReference: reference.toUpperCase(), idempotencyKey, payloadHash: createHash("sha256").update(`${requestId}:${mode}:${request.payableAmount}`).digest("hex") } });
    const attempt = await tx.paystackAttempt.create({ data: { paymentId: payment.id, workspaceId: actor.workspaceId, requestId, receivingAccountId: payment.receivingAccountId, currency: request.currency, mode, reference, idempotencyKey, merchantId: config.merchantId, keyFingerprint: config.keyFingerprint, expectedMinor: BigInt(minor.toFixed(0)) } });
    await tx.auditLog.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, action: "PAYSTACK_CHECKOUT_REQUESTED", resourceType: "SubscriptionRequest", resourceId: requestId, metadata: { mode, attemptId: attempt.id } } });
    return attempt;
  });
  if (prepared.status !== "CREATED") return { reference: prepared.reference, authorizationUrl: ["FAILED", "ABANDONED"].includes(prepared.status) ? null : prepared.authorizationUrl, status: prepared.status };
  // Claim initialization before network I/O. An ambiguous timeout never creates a
  // replacement reference or silently retries a potentially successful POST.
  const claimed = await prisma.paystackAttempt.updateMany({ where: { id: prepared.id, status: "CREATED" }, data: { status: "REVIEW", lastError: "INITIALIZATION_IN_PROGRESS_OR_AMBIGUOUS" } });
  if (!claimed.count) return { reference: prepared.reference, authorizationUrl: null, status: "REVIEW" };
  try {
    await requirePay1Workspace(prisma, prepared.workspaceId);
    const metadata = { coreopsRequestId: prepared.requestId, coreopsWorkspaceId: prepared.workspaceId, coreopsAttemptId: prepared.id, coreopsMerchantId: config.merchantId, coreopsMode: mode };
    const result = await api(config, "transaction/initialize", { email: actor.user.email, amount: prepared.expectedMinor.toString(), currency: prepared.currency, reference: prepared.reference, channels: config.channels, callback_url: `${config.origin}/payments/paystack/return?${new URLSearchParams({ attempt: prepared.reference })}`, metadata: JSON.stringify(metadata) });
    const url = new URL(result.authorization_url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com" || url.username || url.password || result.reference !== prepared.reference) throw new CommercialError("The payment provider returned unexpected checkout details.");
    await prisma.paystackAttempt.updateMany({ where: { id: prepared.id, status: "REVIEW", lastError: "INITIALIZATION_IN_PROGRESS_OR_AMBIGUOUS" }, data: { status: "INITIALIZED", authorizationUrl: url.toString(), lastError: null } });
    return { reference: prepared.reference, authorizationUrl: url.toString(), status: "INITIALIZED" };
  } catch { throw new CommercialError("Checkout initialization needs reconciliation. The existing reference is preserved; do not submit a replacement payment."); }
}

async function verifyAndCredit(reference: string, mode: GatewayMode, administratorId?: string) {
  const config = paystackConfig(mode);
  const attempt = await prisma.paystackAttempt.findUniqueOrThrow({ where: { reference } });
  if (attempt.mode !== mode || attempt.merchantId !== config.merchantId || attempt.keyFingerprint !== config.keyFingerprint) throw new CommercialError("MERCHANT_OR_MODE_MISMATCH");
  await requirePay1Workspace(prisma, attempt.workspaceId, false);
  let ownerIdentity: { externalId: string; email: string } | null = null;
  const requestContext = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: attempt.requestId }, include: { submittedBy: true } });
  if (requestContext.commercialPath === "STANDARD" && requestContext.submittedBy.externalId) {
    try {
      const profile = await (await clerkClient()).users.getUser(requestContext.submittedBy.externalId);
      const email = profile.emailAddresses.find(e => e.id === profile.primaryEmailAddressId);
      if (!profile.banned && !profile.locked && email?.verification?.status === "verified") ownerIdentity = { externalId: profile.id, email: email.emailAddress.trim().toLowerCase() };
    } catch { /* Funds remain recordable; activation requires live Owner verification. */ }
  }
  const data = await api(config, `transaction/verify/${encodeURIComponent(reference)}`);
  const metadata = typeof data.metadata === "string" ? JSON.parse(data.metadata) : data.metadata;
  const rawTransactionId = typeof data.id === "number" && Number.isSafeInteger(data.id) && data.id > 0 ? String(data.id) : typeof data.id === "string" && /^\d{1,30}$/.test(data.id) ? data.id : null;
  const transactionId = rawTransactionId && BigInt(rawTransactionId) > BigInt(0) ? BigInt(rawTransactionId).toString() : null;
  if (data.reference !== reference || data.domain !== mode || data.currency !== attempt.currency || !Number.isSafeInteger(data.amount) || BigInt(data.amount) !== attempt.expectedMinor || !transactionId || !metadata || metadata.coreopsRequestId !== attempt.requestId || metadata.coreopsWorkspaceId !== attempt.workspaceId || metadata.coreopsAttemptId !== attempt.id || metadata.coreopsMerchantId !== attempt.merchantId || metadata.coreopsMode !== mode || (data.integration !== undefined && String(data.integration) !== config.merchantId) || !config.channels.includes(data.channel) || data.plan || (data.split && Object.keys(data.split).length) || (data.subaccount && Object.keys(data.subaccount).length)) throw new CommercialError("PROVIDER_TRANSACTION_MISMATCH");
  if (data.status !== "success") {
    const status = ["failed", "abandoned", "pending", "ongoing", "processing", "reversed"].includes(data.status) ? String(data.status).toUpperCase() : "UNKNOWN";
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${attempt.workspaceId} FOR UPDATE`;
      await requirePay1Workspace(tx, attempt.workspaceId, false);
      const terminal = stagingRequested() && ["FAILED", "ABANDONED"].includes(status);
      const existingReceipt = await tx.subscriptionPaymentReceipt.findUnique({ where: { providerAttemptId: attempt.id } });
      await tx.paystackAttempt.update({ where: { id: attempt.id }, data: { status: terminal && !existingReceipt ? status as "FAILED" | "ABANDONED" : "REVIEW", lastError: `PROVIDER_${status}` } });
      if (terminal && !existingReceipt) {
        await tx.subscriptionPayment.update({ where: { id: attempt.paymentId }, data: { status: "REJECTED", reviewNotes: "Provider independently confirmed this checkout did not complete. A fresh checkout may be started if no charge occurred." } });
        await tx.auditLog.create({ data: { workspaceId: attempt.workspaceId, actorUserId: null, action: "PAYSTACK_TERMINAL_FAILURE_CONFIRMED", resourceType: "PaystackAttempt", resourceId: attempt.id } });
      }
      if (stagingRequested() && status === "REVERSED") {
        const receipt = await tx.subscriptionPaymentReceipt.findUnique({ where: { providerAttemptId: attempt.id } });
        const period = receipt ? await tx.subscriptionPeriod.findFirst({ where: { sourceRequestId: receipt.requestId, revokedAt: null } }) : null;
        if (period) {
          await tx.subscriptionPeriod.update({ where: { id: period.id }, data: { revokedAt: new Date() } });
          await tx.workspace.update({ where: { id: attempt.workspaceId }, data: { activationStatus: "SUSPENDED" } });
          await tx.subscription.update({ where: { workspaceId: attempt.workspaceId }, data: { status: "SUSPENDED" } });
          await tx.auditLog.create({ data: { workspaceId: attempt.workspaceId, actorUserId: null, action: "PROVIDER_REVERSAL_REVIEW_REQUIRED", resourceType: "PaystackAttempt", resourceId: attempt.id } });
        }
      }
    });
    throw new CommercialError("Payment is not confirmed. Check its status or contact support; no new access was granted.");
  }
  const receivedAt = z.string().datetime({ offset: true }).transform(value => new Date(value)).refine(value => value <= new Date()).parse(data.paid_at);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${attempt.workspaceId} FOR UPDATE`;
    await requirePay1Workspace(tx, attempt.workspaceId, false);
    if (requestContext.commercialPath === "STANDARD") {
      const w = await tx.workspace.findUniqueOrThrow({ where: { id: attempt.workspaceId }, select: { marketApplicationId: true } });
      if (w.marketApplicationId) await tx.$queryRaw`SELECT id FROM "MarketApplication" WHERE id=${w.marketApplicationId} FOR UPDATE`;
    }
    if (administratorId) {
      await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${administratorId} FOR UPDATE`;
      const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: administratorId } });
      if (!admin.active || !["SUPER_ADMIN", "BILLING_ADMIN"].includes(admin.role)) throw new CommercialError("Administrator access was revoked.");
    }
    const fresh = await tx.paystackAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { payment: { include: { request: true } }, receipt: true } });
    if (fresh.receipt) { await activateStandardPayment(tx, fresh.requestId, fresh.receipt.id, ownerIdentity); return fresh.receipt.id; }
    const request = fresh.payment.request;
    if (!request.taxSnapshot || !request.approvedAt || !request.quoteAcceptedAt || !request.payableAmount || !request.payableAmount.mul(100).equals(attempt.expectedMinor.toString())) throw new CommercialError("QUOTE_MISMATCH");
    const receipt = await tx.subscriptionPaymentReceipt.create({ data: { submissionId: fresh.paymentId, workspaceId: fresh.workspaceId, requestId: fresh.requestId, receivingAccountId: fresh.receivingAccountId, method: "PAYSTACK", currency: fresh.currency, amount: new Prisma.Decimal(fresh.expectedMinor.toString()).div(100), transactionReference: fresh.reference.toUpperCase(), ledgerEntryId: `paystack:${mode}:${fresh.merchantId}:${transactionId}`, receivedAt, confirmationSource: "PAYSTACK", providerAttemptId: fresh.id, verificationNotes: request.commercialPath === "STANDARD" ? "Authenticated Test Mode provider verification; standard activation is independently gated." : "Confirmed by authenticated Paystack transaction verification; activation requires separate SUPER_ADMIN approval.", taxSnapshot: request.taxSnapshot as Prisma.InputJsonValue } });
    await tx.subscriptionPayment.update({ where: { id: fresh.paymentId }, data: { status: "RECONCILED" } });
    const total = await tx.subscriptionPaymentReceipt.aggregate({ where: { requestId: request.id, reversal: null }, _sum: { amount: true } });
    if (["AWAITING_PAYMENT", "READY_FOR_ACTIVATION"].includes(request.status)) await tx.subscriptionRequest.update({ where: { id: request.id }, data: { status: (total._sum.amount ?? new Prisma.Decimal(0)).gte(request.payableAmount) ? "READY_FOR_ACTIVATION" : "AWAITING_PAYMENT", overpaymentReviewedAt: null, overpaymentReviewedById: null, overpaymentDisposition: null } });
    await tx.paystackAttempt.update({ where: { id: fresh.id }, data: { status: "CONFIRMED", providerTransactionId: transactionId, lastError: null } });
    await tx.auditLog.create({ data: { workspaceId: fresh.workspaceId, actorUserId: null, action: "PAYSTACK_RECEIPT_CONFIRMED", resourceType: "SubscriptionPaymentReceipt", resourceId: receipt.id, metadata: { mode, requestId: fresh.requestId, providerAttemptId: fresh.id } } });
    if (administratorId) await tx.platformAuditEvent.create({ data: { actorAdminId: administratorId, action: "PAYSTACK_RECONCILED", resourceType: "SubscriptionPaymentReceipt", resourceId: receipt.id, workspaceId: fresh.workspaceId, reason: "Authenticated provider reconciliation; manual activation remains separate." } });
    await activateStandardPayment(tx, fresh.requestId, receipt.id, ownerIdentity);
    return receipt.id;
  });
}
export async function processPaystackWebhook(raw: Buffer, modern: string | null, legacy: string | null, mode: GatewayMode) {
  const config = paystackConfig(mode);
  if (!verifyPaystackSignature(raw, modern, legacy, config)) throw new CommercialError("INVALID_SIGNATURE");
  if (pay1Enabled()) await requirePay1Admission(prisma, false);
  const parsed = z.object({ event: z.string().max(100), data: z.unknown() }).parse(JSON.parse(raw.toString("utf8")));
  if (parsed.event !== "charge.success") return;
  const reference = z.object({ reference: z.string().max(100) }).parse(parsed.data).reference;
  if (pay1Enabled()) {
    const scoped = await prisma.paystackAttempt.findUnique({ where: { reference } });
    if (!scoped) throw new CommercialError("RECONCILIATION_REQUIRED");
    await requirePay1Workspace(prisma, scoped.workspaceId, false);
  }
  const eventHash = createHash("sha256").update(raw).digest("hex");
  await prisma.paystackWebhookEvent.createMany({ data: [{ mode, eventHash, reference, eventType: parsed.event }], skipDuplicates: true });
  const event = await prisma.paystackWebhookEvent.findUniqueOrThrow({ where: { mode_eventHash: { mode, eventHash } } });
  if (event.status === "PROCESSED") return;
  const attempt = await prisma.paystackAttempt.findUnique({ where: { reference } });
  if (!attempt) { await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "REVIEW", failureCode: "UNKNOWN_REFERENCE" } }); return; }
  try {
    await verifyAndCredit(reference, mode);
    await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), failureCode: null } });
  } catch {
    await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "REVIEW", failureCode: "VERIFICATION_REQUIRED" } });
    await prisma.paystackAttempt.updateMany({ where: { id: attempt.id, status: { in: ["CREATED", "INITIALIZED", "REVIEW"] } }, data: { status: "REVIEW", lastError: "VERIFICATION_REQUIRED" } });
    throw new CommercialError("RECONCILIATION_REQUIRED");
  }
}
export async function reconcilePaystack(reference: string) {
  const admin = await requirePlatform("billing");
  const attempt = await prisma.paystackAttempt.findUniqueOrThrow({ where: { reference } });
  return verifyAndCredit(reference, attempt.mode, admin.id);
}
export async function paystackQueue() { await requirePlatform("billing"); const admission = pay1Enabled() ? await requirePay1Admission() : null; return prisma.paystackAttempt.findMany({ where: admission ? { payment: { workspace: { marketApplication: { pay1AdmissionId: admission.id } } } } : {}, select: { id: true, reference: true, workspaceId: true, requestId: true, mode: true, status: true, currency: true, expectedMinor: true, lastError: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }); }
export async function registerPaystackMerchant(mode: GatewayMode, approval: string) {
  const actor = await requirePlatform("catalog");
  const config = paystackConfig(mode, true);
  if (pay1Enabled()) await requirePay1Admission();
  z.string().trim().min(10).max(1000).parse(approval);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${actor.id} FOR UPDATE`;
    const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: actor.id } });
    if (!admin.active || admin.role !== "SUPER_ADMIN") throw new CommercialError("Active super administrator required.");
    if (pay1Enabled()) await requirePay1Admission(tx);
    const prior = await tx.paymentReceivingAccount.findUnique({ where: { method_accountIdentifier: { method: "PAYSTACK", accountIdentifier: `paystack:${mode}:${config.merchantId}` } } });
    if (prior) { if (!prior.active || !prior.verifiedAt) throw new CommercialError("Existing merchant requires explicit review."); return prior; }
    const account = await tx.paymentReceivingAccount.create({ data: { label: `Paystack ${mode}`, method: "PAYSTACK", currency: config.currency, accountIdentifier: `paystack:${mode}:${config.merchantId}`, instructions: "Pay through WorkflowConnect approved Paystack checkout. A successful return does not activate the workspace.", active: true, verifiedAt: new Date(), verifiedById: admin.id } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, action: "PAYSTACK_MERCHANT_APPROVED", resourceType: "PaymentReceivingAccount", resourceId: account.id, reason: approval, metadata: { mode, merchantId: config.merchantId, capabilitiesApproval: process.env[`PAYSTACK_${mode.toUpperCase()}_CAPABILITIES_APPROVAL`]!, settlementApproval: process.env[`PAYSTACK_${mode.toUpperCase()}_SETTLEMENT_APPROVAL`]! } } });
    return account;
  });
}
export function checkoutMode(): GatewayMode | null {
  const mode = process.env.COREOPS_ENVIRONMENT === "production" ? "live" : "test";
  try { paystackConfig(mode, true); return mode; } catch { return null; }
}

// Authenticated payer reconciliation, never an unsigned browser confirmation.
export async function reconcileOwnPaystack(reference: string) {
  if (!stagingRequested()) throw new CommercialError("Self-service payment reconciliation is staging-only.");
  await requireStagingEnvironment();
  z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).parse(reference);
  await requireCentralHost();
  const user = await getCurrentUser();
  const attempt = await prisma.paystackAttempt.findFirstOrThrow({ where: { reference, payment: { submittedByUserId: user.id, workspace: { members: { some: { userId: user.id, status: "ACTIVE", role: "OWNER" } } } }, mode: "test" } });
  await verifyAndCredit(attempt.reference, "test");
  const request = await prisma.subscriptionRequest.findUniqueOrThrow({ where: { id: attempt.requestId }, select: { status: true } });
  return { ...request, operational: (await commercialAccess(attempt.workspaceId)).write };
}
