-- CreateEnum
CREATE TYPE "VatRegistrationStatus" AS ENUM ('UNVERIFIED', 'NOT_REGISTERED', 'REGISTERED', 'DEREGISTERED');

-- CreateEnum
CREATE TYPE "PaymentConfirmationSource" AS ENUM ('MANUAL', 'PAYSTACK');

-- CreateEnum
CREATE TYPE "PaystackMode" AS ENUM ('test', 'live');

-- CreateEnum
CREATE TYPE "PaystackAttemptStatus" AS ENUM ('CREATED', 'INITIALIZED', 'CONFIRMED', 'REVIEW');

-- CreateEnum
CREATE TYPE "PaymentEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'REVIEW');

-- AlterEnum
ALTER TYPE "ManualPaymentMethod" ADD VALUE 'PAYSTACK';

-- AlterTable
ALTER TABLE "SubscriptionRequest" ADD COLUMN     "netAmount" DECIMAL(18,2),
ADD COLUMN     "taxSnapshot" JSONB,
ADD COLUMN     "vatRate" DECIMAL(7,4);

-- AlterTable
ALTER TABLE "SubscriptionPaymentReceipt" ADD COLUMN     "confirmationSource" "PaymentConfirmationSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "providerAttemptId" TEXT,
ADD COLUMN     "taxSnapshot" JSONB,
ALTER COLUMN "verifiedById" DROP NOT NULL;

-- CreateTable
CREATE TABLE "TaxConfiguration" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "registrationStatus" "VatRegistrationStatus" NOT NULL,
    "registrationReference" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "allowedTreatments" JSONB NOT NULL,
    "approvalReference" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "receivingAccountId" TEXT NOT NULL,
    "method" "ManualPaymentMethod" NOT NULL DEFAULT 'PAYSTACK',
    "currency" TEXT NOT NULL,
    "mode" "PaystackMode" NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "keyFingerprint" TEXT NOT NULL,
    "expectedMinor" BIGINT NOT NULL,
    "providerTransactionId" TEXT,
    "status" "PaystackAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "authorizationUrl" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaystackAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaystackWebhookEvent" (
    "id" TEXT NOT NULL,
    "mode" "PaystackMode" NOT NULL,
    "eventHash" TEXT NOT NULL,
    "reference" TEXT,
    "eventType" TEXT NOT NULL,
    "status" "PaymentEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaystackWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfiguration_version_key" ON "TaxConfiguration"("version");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConfiguration_effectiveFrom_key" ON "TaxConfiguration"("effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_paymentId_key" ON "PaystackAttempt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_reference_key" ON "PaystackAttempt"("reference");

-- CreateIndex
CREATE INDEX "PaystackAttempt_status_createdAt_idx" ON "PaystackAttempt"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_workspaceId_idempotencyKey_key" ON "PaystackAttempt"("workspaceId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_paymentId_workspaceId_requestId_receivingAc_key" ON "PaystackAttempt"("paymentId", "workspaceId", "requestId", "receivingAccountId", "method", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_mode_merchantId_providerTransactionId_key" ON "PaystackAttempt"("mode", "merchantId", "providerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackAttempt_id_paymentId_workspaceId_requestId_receivin_key" ON "PaystackAttempt"("id", "paymentId", "workspaceId", "requestId", "receivingAccountId", "method", "currency");

-- CreateIndex
CREATE INDEX "PaystackWebhookEvent_status_createdAt_idx" ON "PaystackWebhookEvent"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaystackWebhookEvent_mode_eventHash_key" ON "PaystackWebhookEvent"("mode", "eventHash");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_providerAttemptId_key" ON "SubscriptionPaymentReceipt"("providerAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPaymentReceipt_providerAttemptId_submissionId_w_key" ON "SubscriptionPaymentReceipt"("providerAttemptId", "submissionId", "workspaceId", "requestId", "receivingAccountId", "method", "currency");

-- AddForeignKey
ALTER TABLE "SubscriptionPaymentReceipt" ADD CONSTRAINT "SubscriptionPaymentReceipt_providerAttemptId_submissionId__fkey" FOREIGN KEY ("providerAttemptId", "submissionId", "workspaceId", "requestId", "receivingAccountId", "method", "currency") REFERENCES "PaystackAttempt"("id", "paymentId", "workspaceId", "requestId", "receivingAccountId", "method", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxConfiguration" ADD CONSTRAINT "TaxConfiguration_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "PlatformAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaystackAttempt" ADD CONSTRAINT "PaystackAttempt_paymentId_workspaceId_requestId_receivingA_fkey" FOREIGN KEY ("paymentId", "workspaceId", "requestId", "receivingAccountId", "method", "currency") REFERENCES "SubscriptionPayment"("id", "workspaceId", "requestId", "receivingAccountId", "method", "currency") ON DELETE RESTRICT ON UPDATE CASCADE;

