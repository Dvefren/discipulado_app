-- Add altTableId to Attendance
ALTER TABLE "Attendance"
  ADD COLUMN "altTableId" TEXT;

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_altTableId_fkey"
  FOREIGN KEY ("altTableId") REFERENCES "FacilitatorTable"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;