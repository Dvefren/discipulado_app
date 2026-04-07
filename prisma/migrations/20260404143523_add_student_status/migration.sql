-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'QUIT');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "quitDate" TIMESTAMP(3),
ADD COLUMN "quitReason" TEXT;