-- CreateEnum
CREATE TYPE "WorkspaceActivationStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionRequestType" AS ENUM ('INITIAL', 'RENEWAL', 'UPGRADE');

-- CreateEnum
CREATE TYPE "CommercialRequestStatus" AS ENUM ('SUBMITTED', 'QUOTED', 'AWAITING_PAYMENT', 'READY_FOR_ACTIVATION', 'ACTIVATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManualPaymentMethod" AS ENUM ('MPESA', 'BANK');

-- CreateEnum
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('SUBMITTED', 'RECONCILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('UNCONFIRMED', 'INCLUSIVE', 'EXCLUSIVE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT');

-- AlterEnum
ALTER TYPE "SubscriptionPlan" ADD VALUE 'SOLO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING_ACTIVATION';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'SUSPENDED';

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activationStatus" "WorkspaceActivationStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "gracePeriodEnd" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING_ACTIVATION';

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "actorAdminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlanOffer" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "memberLimit" INTEGER,
    "projectLimit" INTEGER,
    "invitationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL,
    "taxTreatment" "TaxTreatment" NOT NULL DEFAULT 'UNCONFIRMED',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "businessApprovedAt" TIMESTAMP(3),
    "businessApprovalRef" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlanOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReceivingAccount" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "accountIdentifier" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceivingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "type" "SubscriptionRequestType" NOT NULL,
    "status" "CommercialRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "offerVersion" INTEGER NOT NULL,
    "catalogAmount" DECIMAL(18,2),
    "quotedAmount" DECIMAL(18,2),
    "taxAmount" DECIMAL(18,2),
    "payableAmount" DECIMAL(18,2),
    "currency" TEXT NOT NULL,
    "memberLimit" INTEGER,
    "projectLimit" INTEGER,
    "invitationsEnabled" BOOLEAN NOT NULL,
    "features" JSONB NOT NULL,
    "taxTreatment" "TaxTreatment" NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNotes" TEXT,
    "quoteAcceptedAt" TIMESTAMP(3),
    "receivingAccountId" TEXT,
    "paymentInstructions" JSONB,
    "overpaymentReviewedAt" TIMESTAMP(3),
    "overpaymentReviewedById" TEXT,
    "overpaymentDisposition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "receivingAccountId" TEXT NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "currency" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "proposedAmount" DECIMAL(18,2) NOT NULL,
    "submittedReference" TEXT NOT NULL,
    "normalizedReference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPaymentReceipt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "receivingAccountId" TEXT NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT NOT NULL,
    "verificationNotes" TEXT NOT NULL,

    CONSTRAINT "SubscriptionPaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPaymentReversal" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "actorAdminId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reversedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPaymentReversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPeriod" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "sourceRequestId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "graceEndsAt" TIMESTAMP(3) NOT NULL,
    "anchorDay" INTEGER NOT NULL,
    "memberLimit" INTEGER NOT NULL,
    "projectLimit" INTEGER,
    "invitationsEnabled" BOOLEAN NOT NULL,
    "features" JSONB NOT NULL,
    "agreedAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "activatedById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_userId_key" ON "PlatformAdmin"("userId");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_workspaceId_createdAt_idx" ON "PlatformAuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_createdAt_idx" ON "PlatformAuditEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanOffer_plan_interval_version_key" ON "SubscriptionPlanOffer"("plan", "interval", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceivingAccount_method_accountIdentifier_key" ON "PaymentReceivingAccount"("method", "accountIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceivingAccount_id_method_currency_key" ON "PaymentReceivingAccount"("id", "method", "currency");

-- CreateIndex
CREATE INDEX "SubscriptionRequest_status_createdAt_idx" ON "SubscriptionRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequest_workspaceId_idempotencyKey_key" ON "SubscriptionRequest"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequest_id_workspaceId_key" ON "SubscriptionRequest"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequest_id_workspaceId_subscriptionId_key" ON "SubscriptionRequest"("id", "workspaceId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRequest_id_workspaceId_receivingAccountId_curre_key" ON "SubscriptionRequest"("id", "workspaceId", "receivingAccountId", "currency");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_status_createdAt_idx" ON "SubscriptionPayment"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_requestId_idempotencyKey_key" ON "SubscriptionPayment"("requestId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPayment_id_workspaceId_requestId_receivingAccou_key" ON "SubscriptionPayment"("id", "workspaceId", "requestId", "receivingAccountId", "method", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_submissionId_key" ON "SubscriptionPaymentReceipt"("submissionId");

-- CreateIndex
CREATE INDEX "SubscriptionPaymentReceipt_workspaceId_requestId_idx" ON "SubscriptionPaymentReceipt"("workspaceId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_submissionId_workspaceId_request_key" ON "SubscriptionPaymentReceipt"("submissionId", "workspaceId", "requestId", "receivingAccountId", "method", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_receivingAccountId_method_transa_key" ON "SubscriptionPaymentReceipt"("receivingAccountId", "method", "transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_receivingAccountId_ledgerEntryId_key" ON "SubscriptionPaymentReceipt"("receivingAccountId", "ledgerEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReversal_receiptId_key" ON "SubscriptionPaymentReversal"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPeriod_sourceRequestId_key" ON "SubscriptionPeriod"("sourceRequestId");

-- CreateIndex
CREATE INDEX "SubscriptionPeriod_workspaceId_startsAt_endsAt_idx" ON "SubscriptionPeriod"("workspaceId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPeriod_sourceRequestId_workspaceId_subscription_key" ON "SubscriptionPeriod"("sourceRequestId", "workspaceId", "subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_id_workspaceId_key" ON "Subscription"("id", "workspaceId");

-- AddForeignKey
ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformAuditEvent" ADD CONSTRAINT "PlatformAuditEvent_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlanOffer" ADD CONSTRAINT "SubscriptionPlanOffer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceivingAccount" ADD CONSTRAINT "PaymentReceivingAccount_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_subscriptionId_workspaceId_fkey" FOREIGN KEY ("subscriptionId", "workspaceId") REFERENCES "Subscription"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "SubscriptionPlanOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_receivingAccountId_fkey" FOREIGN KEY ("receivingAccountId") REFERENCES "PaymentReceivingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_overpaymentReviewedById_fkey" FOREIGN KEY ("overpaymentReviewedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_requestId_workspaceId_receivingAccount_fkey" FOREIGN KEY ("requestId", "workspaceId", "receivingAccountId", "currency") REFERENCES "SubscriptionRequest"("id", "workspaceId", "receivingAccountId", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_receivingAccountId_method_currency_fkey" FOREIGN KEY ("receivingAccountId", "method", "currency") REFERENCES "PaymentReceivingAccount"("id", "method", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentReceipt" ADD CONSTRAINT "SubscriptionPaymentReceipt_submissionId_workspaceId_reques_fkey" FOREIGN KEY ("submissionId", "workspaceId", "requestId", "receivingAccountId", "method", "currency") REFERENCES "SubscriptionPayment"("id", "workspaceId", "requestId", "receivingAccountId", "method", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentReceipt" ADD CONSTRAINT "SubscriptionPaymentReceipt_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentReversal" ADD CONSTRAINT "SubscriptionPaymentReversal_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SubscriptionPaymentReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentReversal" ADD CONSTRAINT "SubscriptionPaymentReversal_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_subscriptionId_workspaceId_fkey" FOREIGN KEY ("subscriptionId", "workspaceId") REFERENCES "Subscription"("id", "workspaceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_sourceRequestId_workspaceId_subscriptio_fkey" FOREIGN KEY ("sourceRequestId", "workspaceId", "subscriptionId") REFERENCES "SubscriptionRequest"("id", "workspaceId", "subscriptionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPeriod" ADD CONSTRAINT "SubscriptionPeriod_activatedById_fkey" FOREIGN KEY ("activatedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

