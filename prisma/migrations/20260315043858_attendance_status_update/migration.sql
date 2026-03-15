/*
  Warnings:

  - You are about to drop the column `present` on the `Attendance` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'PREVIEWED', 'RECOVERED');

-- CreateEnum
CREATE TYPE "AbsentReason" AS ENUM ('SICK', 'WORK', 'PERSONAL', 'TRAVEL', 'OTHER');

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "present",
ADD COLUMN     "absentNote" TEXT,
ADD COLUMN     "absentReason" "AbsentReason",
ADD COLUMN     "altScheduleId" TEXT,
ADD COLUMN     "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_altScheduleId_fkey" FOREIGN KEY ("altScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
