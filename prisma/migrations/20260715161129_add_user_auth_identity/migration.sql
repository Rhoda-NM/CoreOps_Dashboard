-- AlterTable
ALTER TABLE "User" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "externalId" DROP NOT NULL;
