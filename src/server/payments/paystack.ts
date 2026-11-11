import "server-only";
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
    const owner = await tx.workspaceMember.findFirst({ where: { id: actor.id, userId: actor.userId, workspaceId: actor.workspaceId, status: "ACTIVE", role: "OWNER", workspace: { activationStatus: { not: "CLOSED" } } } });
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
  if (prepared.status !== "CREATED") return { reference: prepared.reference, authorizationUrl: prepared.authorizationUrl, status: prepared.status };
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
  const data = await api(config, `transaction/verify/${encodeURIComponent(reference)}`);
  const metadata = typeof data.metadata === "string" ? JSON.parse(data.metadata) : data.metadata;
  const rawTransactionId = typeof data.id === "number" && Number.isSafeInteger(data.id) && data.id > 0 ? String(data.id) : typeof data.id === "string" && /^\d{1,30}$/.test(data.id) ? data.id : null;
  const transactionId = rawTransactionId && BigInt(rawTransactionId) > BigInt(0) ? BigInt(rawTransactionId).toString() : null;
  if (data.status !== "success" || data.reference !== reference || data.domain !== mode || data.currency !== attempt.currency || !Number.isSafeInteger(data.amount) || BigInt(data.amount) !== attempt.expectedMinor || !transactionId || !metadata || metadata.coreopsRequestId !== attempt.requestId || metadata.coreopsWorkspaceId !== attempt.workspaceId || metadata.coreopsAttemptId !== attempt.id || metadata.coreopsMerchantId !== attempt.merchantId || metadata.coreopsMode !== mode || (data.integration !== undefined && String(data.integration) !== config.merchantId) || !config.channels.includes(data.channel) || data.plan || (data.split && Object.keys(data.split).length) || (data.subaccount && Object.keys(data.subaccount).length)) throw new CommercialError("PROVIDER_TRANSACTION_MISMATCH");
  const receivedAt = z.string().datetime({ offset: true }).transform(value => new Date(value)).refine(value => value <= new Date()).parse(data.paid_at);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${attempt.workspaceId} FOR UPDATE`;
    await requirePay1Workspace(tx, attempt.workspaceId, false);
    if (administratorId) {
      await tx.$queryRaw`SELECT id FROM "PlatformAdmin" WHERE id=${administratorId} FOR UPDATE`;
      const admin = await tx.platformAdmin.findUniqueOrThrow({ where: { id: administratorId } });
      if (!admin.active || !["SUPER_ADMIN", "BILLING_ADMIN"].includes(admin.role)) throw new CommercialError("Administrator access was revoked.");
    }
    const fresh = await tx.paystackAttempt.findUniqueOrThrow({ where: { id: attempt.id }, include: { payment: { include: { request: true } }, receipt: true } });
    if (fresh.receipt) return fresh.receipt.id;
    const request = fresh.payment.request;
    if (!request.taxSnapshot || !request.approvedAt || !request.quoteAcceptedAt || !request.payableAmount || !request.payableAmount.mul(100).equals(attempt.expectedMinor.toString())) throw new CommercialError("QUOTE_MISMATCH");
    const receipt = await tx.subscriptionPaymentReceipt.create({ data: { submissionId: fresh.paymentId, workspaceId: fresh.workspaceId, requestId: fresh.requestId, receivingAccountId: fresh.receivingAccountId, method: "PAYSTACK", currency: fresh.currency, amount: new Prisma.Decimal(fresh.expectedMinor.toString()).div(100), transactionReference: fresh.reference.toUpperCase(), ledgerEntryId: `paystack:${mode}:${fresh.merchantId}:${transactionId}`, receivedAt, confirmationSource: "PAYSTACK", providerAttemptId: fresh.id, verificationNotes: "Confirmed by authenticated Paystack transaction verification; activation requires separate SUPER_ADMIN approval.", taxSnapshot: request.taxSnapshot as Prisma.InputJsonValue } });
    await tx.subscriptionPayment.update({ where: { id: fresh.paymentId }, data: { status: "RECONCILED" } });
    const total = await tx.subscriptionPaymentReceipt.aggregate({ where: { requestId: request.id, reversal: null }, _sum: { amount: true } });
    if (["AWAITING_PAYMENT", "READY_FOR_ACTIVATION"].includes(request.status)) await tx.subscriptionRequest.update({ where: { id: request.id }, data: { status: (total._sum.amount ?? new Prisma.Decimal(0)).gte(request.payableAmount) ? "READY_FOR_ACTIVATION" : "AWAITING_PAYMENT", overpaymentReviewedAt: null, overpaymentReviewedById: null, overpaymentDisposition: null } });
    await tx.paystackAttempt.update({ where: { id: fresh.id }, data: { status: "CONFIRMED", providerTransactionId: transactionId, lastError: null } });
    await tx.auditLog.create({ data: { workspaceId: fresh.workspaceId, actorUserId: null, action: "PAYSTACK_RECEIPT_CONFIRMED", resourceType: "SubscriptionPaymentReceipt", resourceId: receipt.id, metadata: { mode, requestId: fresh.requestId, providerAttemptId: fresh.id } } });
    if (administratorId) await tx.platformAuditEvent.create({ data: { actorAdminId: administratorId, action: "PAYSTACK_RECONCILED", resourceType: "SubscriptionPaymentReceipt", resourceId: receipt.id, workspaceId: fresh.workspaceId, reason: "Authenticated provider reconciliation; manual activation remains separate." } });
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
  const event = await prisma.paystackWebhookEvent.upsert({ where: { mode_eventHash: { mode, eventHash } }, update: {}, create: { mode, eventHash, reference, eventType: parsed.event } });
  if (event.status === "PROCESSED") return;
  const attempt = await prisma.paystackAttempt.findUnique({ where: { reference } });
  if (!attempt) { await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "REVIEW", failureCode: "UNKNOWN_REFERENCE" } }); return; }
  try {
    await verifyAndCredit(reference, mode);
    await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), failureCode: null } });
  } catch {
    await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { status: "REVIEW", failureCode: "VERIFICATION_REQUIRED" } });
    await prisma.paystackAttempt.updateMany({ where: { id: attempt.id, status: { not: "CONFIRMED" } }, data: { status: "REVIEW", lastError: "VERIFICATION_REQUIRED" } });
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
    const account = await tx.paymentReceivingAccount.create({ data: { label: `Paystack ${mode}`, method: "PAYSTACK", currency: config.currency, accountIdentifier: `paystack:${mode}:${config.merchantId}`, instructions: "Pay through WorkflowConnect approved Paystack checkout. A successful return does not activate the workspace.", active: true, verifiedAt: new Date(), verifiedById: admin.id } });
    await tx.platformAuditEvent.create({ data: { actorAdminId: admin.id, action: "PAYSTACK_MERCHANT_APPROVED", resourceType: "PaymentReceivingAccount", resourceId: account.id, reason: approval, metadata: { mode, merchantId: config.merchantId, capabilitiesApproval: process.env[`PAYSTACK_${mode.toUpperCase()}_CAPABILITIES_APPROVAL`]!, settlementApproval: process.env[`PAYSTACK_${mode.toUpperCase()}_SETTLEMENT_APPROVAL`]! } } });
    return account;
  });
}
export function checkoutMode(): GatewayMode | null {
  const mode = process.env.COREOPS_ENVIRONMENT === "production" ? "live" : "test";
  try { paystackConfig(mode, true); return mode; } catch { return null; }
}
