import "server-only";
import { Prisma, type SubscriptionPlanOffer } from "@prisma/client";
import { requireStagingEnvironment } from "../staging/environment";
import { stagingRequested } from "../staging/config";
import { calculateTax, currentTaxConfiguration } from "./tax";
import { CommercialError, DAY, periodEnd } from "./policy";
import { paystackConfig } from "../payments/paystack-config";
import { capacity } from "./access";
import { requireWorkspaceMarket } from "../market/access";
import { AccessError } from "../authorization/errors";

export async function standardQuotation(tx: Prisma.TransactionClient, offer: SubscriptionPlanOffer) {
  const environment = await requireStagingEnvironment(tx);
  if (offer.commercialPath !== "STANDARD" || offer.stagingEnvironmentId !== environment.id || !offer.published || !offer.businessApprovedAt || !offer.amount || !offer.memberLimit || offer.plan === "ENTERPRISE") throw new CommercialError("An approved standard staging offer is required.");
  const latest = await tx.subscriptionPlanOffer.findFirst({ where: { stagingEnvironmentId: environment.id, plan: offer.plan, interval: offer.interval, published: true }, orderBy: { version: "desc" } });
  if (latest?.id !== offer.id) throw new CommercialError("A newer approved offer is available. Refresh the subscription page.");
  const config = paystackConfig("test", true);
  const account = await tx.paymentReceivingAccount.findUnique({ where: { method_accountIdentifier: { method: "PAYSTACK", accountIdentifier: `paystack:test:${config.merchantId}` } } });
  if (!account?.active || !account.verifiedAt || account.currency !== "KES") throw new CommercialError("The Test Mode merchant must be verified before checkout.");
  const taxConfig = await currentTaxConfiguration(tx);
  if (!taxConfig?.synthetic) throw new CommercialError("An approved synthetic staging tax configuration is required.");
  const tax = calculateTax(offer.amount, offer.taxTreatment, taxConfig);
  return { status: "QUOTED" as const, quotedAmount: offer.amount, taxAmount: tax.tax, payableAmount: tax.payable, netAmount: tax.net, vatRate: tax.rate, taxSnapshot: tax.snapshot, approvedAt: new Date(), reviewNotes: "Server-priced standard offer; no per-customer administrator review.", receivingAccountId: account.id, paymentInstructions: { label: account.label, method: account.method, currency: account.currency, instructions: "Pay securely through Paystack Test Mode. Verified matching standard payments activate automatically." } };
}

// Called only from authenticated provider verification while holding Workspace.
// A denied market/lifecycle/owner never discards a legitimate financial receipt.
export async function activateStandardPayment(tx: Prisma.TransactionClient, requestId: string, receiptId: string, ownerIdentity: { externalId: string; email: string } | null) {
  const request = await tx.subscriptionRequest.findUniqueOrThrow({ where: { id: requestId }, include: { workspace: true } });
  if (request.commercialPath !== "STANDARD") return;
  if (!stagingRequested()) throw new CommercialError("Standard test activation is staging-only.");
  const environment = await requireStagingEnvironment(tx);
  const existing = await tx.subscriptionPeriod.findUnique({ where: { sourceRequestId: requestId } });
  if (existing) return existing;
  let marketAllowed = true;
  try { await requireWorkspaceMarket(tx, request.workspaceId); } catch (error) { if (error instanceof AccessError) marketAllowed = false; else throw error; }
  const receipt = await tx.subscriptionPaymentReceipt.findUniqueOrThrow({ where: { id: receiptId }, include: { providerAttempt: true, reversal: true } });
  const total = await tx.subscriptionPaymentReceipt.aggregate({ where: { requestId, reversal: null }, _sum: { amount: true } });
  const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: request.subscriptionId } });
  const owner = await tx.workspaceMember.findFirst({ where: { workspaceId: request.workspaceId, userId: request.submittedByUserId, status: "ACTIVE", role: "OWNER" }, include: { user: true } });
  const previous = await tx.subscriptionPeriod.findFirst({ where: { workspaceId: request.workspaceId, revokedAt: null }, orderBy: { endsAt: "desc" } });
  const ownerMatches = !!ownerIdentity && !!owner && !owner.user.platformSuspended && owner.user.externalId === ownerIdentity.externalId && owner.user.email.trim().toLowerCase() === ownerIdentity.email;
  const ready = request.status === "READY_FOR_ACTIVATION" && !!request.approvedAt && !!request.quoteAcceptedAt && !!request.taxSnapshot && !!request.payableAmount && !!request.memberLimit && request.type !== "UPGRADE";
  const receiptMatches = receipt.requestId === request.id && receipt.workspaceId === request.workspaceId && receipt.confirmationSource === "PAYSTACK" && receipt.providerAttempt?.mode === "test" && !receipt.reversal;
  const exactFunding = !!request.payableAmount && !!total._sum.amount?.equals(request.payableAmount) && !await tx.subscriptionPayment.count({ where: { requestId, status: "SUBMITTED" } });
  const fitsCapacity = await capacity(request.workspaceId, tx) <= (request.memberLimit ?? 0) && (request.plan !== "SOLO" || (!request.invitationsEnabled && !await tx.workspaceMember.count({ where: { workspaceId: request.workspaceId, role: { not: "OWNER" } } })));
  const historyMatches = ((request.type === "INITIAL") === !previous) && (!previous || (previous.plan === request.plan && previous.interval === request.interval));
  if (!ownerMatches || !marketAllowed || !ready || !receiptMatches || !exactFunding || !fitsCapacity || !historyMatches || request.stagingEnvironmentId !== environment.id || ["SUSPENDED", "CLOSED"].includes(request.workspace.activationStatus) || ["SUSPENDED", "CANCELED"].includes(subscription.status)) {
    await tx.auditLog.create({ data: { workspaceId: request.workspaceId, actorUserId: null, action: "STANDARD_ACTIVATION_REVIEW_REQUIRED", resourceType: "SubscriptionRequest", resourceId: requestId } });
    return;
  }
  const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  const startsAt = previous && previous.endsAt > now ? previous.endsAt : now;
  const anchorDay = previous && previous.endsAt > now ? previous.anchorDay : startsAt.getUTCDate();
  const endsAt = periodEnd(startsAt, request.interval, anchorDay);
  const period = await tx.subscriptionPeriod.create({ data: { workspaceId: request.workspaceId, subscriptionId: request.subscriptionId, sourceRequestId: request.id, plan: request.plan, interval: request.interval, startsAt, endsAt, graceEndsAt: new Date(+endsAt + 7 * DAY), anchorDay, memberLimit: request.memberLimit!, projectLimit: request.projectLimit, invitationsEnabled: request.invitationsEnabled, features: request.features as Prisma.InputJsonValue, agreedAmount: request.payableAmount!, currency: request.currency, activationSource: "PAYSTACK_TEST", verifiedReceiptId: receipt.id } });
  await tx.subscription.update({ where: { id: request.subscriptionId }, data: { plan: request.plan, status: "ACTIVE", currentPeriodEnd: endsAt, gracePeriodEnd: period.graceEndsAt } });
  await tx.workspace.update({ where: { id: request.workspaceId }, data: { activationStatus: "ACTIVE", activatedAt: request.workspace.activatedAt ?? now } });
  await tx.subscriptionRequest.update({ where: { id: requestId }, data: { status: "ACTIVATED" } });
  await tx.auditLog.create({ data: { workspaceId: request.workspaceId, actorUserId: null, action: "STANDARD_SUBSCRIPTION_ACTIVATED", resourceType: "SubscriptionPeriod", resourceId: period.id, metadata: { requestId, receiptId: receipt.id, environmentId: environment.id, activationSource: "PAYSTACK_TEST" } } });
  return period;
}
