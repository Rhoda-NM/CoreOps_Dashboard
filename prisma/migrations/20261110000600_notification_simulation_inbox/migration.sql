-- AlterTable
ALTER TABLE "NotificationProviderEvent" ADD COLUMN     "candidateAttemptId" TEXT,
ADD COLUMN     "candidateNotificationId" TEXT;

ALTER TABLE "NotificationProviderEvent" ADD CHECK (("candidateNotificationId" IS NULL OR length("candidateNotificationId")<=100) AND ("candidateAttemptId" IS NULL OR length("candidateAttemptId")<=100));
