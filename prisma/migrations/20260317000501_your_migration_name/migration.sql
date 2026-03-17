-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('BIRTHDAY', 'CLASS', 'COURSE_DATE', 'SNACK', 'DYNAMICS', 'OTHER');

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'OTHER';
