INSERT INTO "_prisma_migrations" (
  id, checksum, migration_name, started_at, finished_at, applied_steps_count
) VALUES (
  gen_random_uuid()::text, 'manual',
  '20260411140000_graduation_fund_entries',
  NOW(), NOW(), 1
);