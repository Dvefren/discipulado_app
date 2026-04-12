INSERT INTO "_prisma_migrations" (
  id, checksum, migration_name, started_at, finished_at, applied_steps_count
) VALUES (
  gen_random_uuid()::text, 'manual',
  '20260410180000_facilitator_profile',
  NOW(), NOW(), 1
);