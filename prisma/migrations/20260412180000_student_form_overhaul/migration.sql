-- 1. Create Gender enum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- 2. Add new columns (all nullable)
ALTER TABLE "Student"
  ADD COLUMN "gender"                "Gender",
  ADD COLUMN "maritalStatus"         TEXT,
  ADD COLUMN "isMother"              BOOLEAN,
  ADD COLUMN "isFather"              BOOLEAN,
  ADD COLUMN "email"                 TEXT,
  ADD COLUMN "placeOfBirth"          TEXT,
  ADD COLUMN "street"                TEXT,
  ADD COLUMN "streetNumber"          TEXT,
  ADD COLUMN "neighborhood"          TEXT,
  ADD COLUMN "landlinePhone"         TEXT,
  ADD COLUMN "educationLevel"        TEXT,
  ADD COLUMN "workplace"             TEXT,
  ADD COLUMN "livingSituation"       TEXT,
  ADD COLUMN "emergencyContactName"  TEXT,
  ADD COLUMN "emergencyContactPhone" TEXT,
  ADD COLUMN "acceptedChrist"        BOOLEAN,
  ADD COLUMN "isBaptized"            BOOLEAN,
  ADD COLUMN "baptismDate"           TIMESTAMP(3),
  ADD COLUMN "howArrivedToChurch"    TEXT,
  ADD COLUMN "coursePurpose"         TEXT,
  ADD COLUMN "prayerAddiction"       TEXT,
  ADD COLUMN "testimony"             TEXT,
  ADD COLUMN "enrollmentDate"        TIMESTAMP(3);

-- 3. Rename phone -> cellPhone
ALTER TABLE "Student" RENAME COLUMN "phone" TO "cellPhone";

-- 4. Preserve old address into neighborhood as a fallback
UPDATE "Student"
SET "neighborhood" = "address"
WHERE "address" IS NOT NULL AND "address" != '';

-- 5. Drop old columns
ALTER TABLE "Student" DROP COLUMN "address";
ALTER TABLE "Student" DROP COLUMN "profileNotes";

-- 6. Drop the dynamic ProfileQuestion table
DROP TABLE IF EXISTS "ProfileQuestion";