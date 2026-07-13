-- AUDIT-001: Tenant-scope Setting rows per gym (composite unique gymId + key).

ALTER TABLE "Setting" ADD COLUMN "gymId" UUID;

-- Keys that embed a trailing UUID (e.g. session_timeout_minutes:<gymId>, wa_lifecycle_tpl:...:<gymId>)
UPDATE "Setting" s
SET "gymId" = (
  SELECT (regexp_match(s.key, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'))[1]::uuid
)
WHERE "gymId" IS NULL
  AND s.key ~ '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$';

-- Remaining rows (flat keys, idempotency): assign to earliest gym
UPDATE "Setting"
SET "gymId" = (SELECT id FROM "Gym" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "gymId" IS NULL;

-- Duplicate flat tenant keys for every gym (reminderSmsEnabled, etc.)
INSERT INTO "Setting" (id, "gymId", key, value, description, "updatedAt")
SELECT
  gen_random_uuid()::text,
  g.id,
  s.key,
  s.value,
  s.description,
  NOW()
FROM "Setting" s
CROSS JOIN "Gym" g
WHERE s.key NOT LIKE 'idempotency:%'
  AND s.key !~ ':[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM "Setting" s2 WHERE s2."gymId" = g.id AND s2.key = s.key
  );

DELETE FROM "Setting" s
WHERE s.key NOT LIKE 'idempotency:%'
  AND s.key !~ ':[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND s."gymId" <> (
    SELECT g.id FROM "Gym" g
    WHERE NOT EXISTS (
      SELECT 1 FROM "Setting" s2
      WHERE s2."gymId" = g.id AND s2.key = s.key AND s2.id <> s.id
    )
    ORDER BY g."createdAt" ASC
    LIMIT 1
  );

ALTER TABLE "Setting" ALTER COLUMN "gymId" SET NOT NULL;

DROP INDEX IF EXISTS "Setting_key_key";

CREATE UNIQUE INDEX "Setting_gymId_key_key" ON "Setting"("gymId", "key");
CREATE INDEX "Setting_gymId_idx" ON "Setting"("gymId");

ALTER TABLE "Setting" ADD CONSTRAINT "Setting_gymId_fkey"
  FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
