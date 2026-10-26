-- ============================================================
-- Migration 001 - align an EXISTING database with schema.sql
-- ============================================================
--
-- schema.sql uses CREATE TABLE IF NOT EXISTS, which does NOT alter
-- tables that already exist. A database created from the original
-- schema therefore keeps:
--
--   * TIMESTAMP (no zone) columns defaulted from NOW()
--   * no UNIQUE constraint on services.name, so ON CONFLICT (name)
--     raises "there is no unique or exclusion constraint matching"
--   * the two single-column metrics indexes
--
-- This script converts such a database in place. It is idempotent:
-- running it twice is a no-op the second time.
--
-- Run inside a transaction so a failure leaves nothing half-applied.

BEGIN;

-- ------------------------------------------------------------
-- 1. TIMESTAMP -> TIMESTAMPTZ
-- ------------------------------------------------------------
-- Existing values were produced by NOW() and stored without a zone,
-- which silently converted them to the server's local time. Re-read
-- them in that same zone so no stored instant moves during the cast.

DO $migrate_timestamps$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT * FROM (VALUES
            ('services',  'created_at'),
            ('metrics',   'recorded_at'),
            ('events',    'created_at'),
            ('anomalies', 'detected_at')
        ) AS t(tbl, col)
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name  = target.tbl
              AND column_name = target.col
              AND data_type   = 'timestamp without time zone'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ '
                'USING %I AT TIME ZONE current_setting(''TimeZone'')',
                target.tbl, target.col, target.col
            );
            RAISE NOTICE 'converted %.% to timestamptz', target.tbl, target.col;
        END IF;
    END LOOP;
END
$migrate_timestamps$;

-- ------------------------------------------------------------
-- 2. Collapse duplicate services before adding UNIQUE(name)
-- ------------------------------------------------------------
-- Re-running the original schema inserted the seed rows again,
-- because ON CONFLICT DO NOTHING had no constraint to conflict on.
-- Children are repointed at the surviving row FIRST - deleting a
-- service first would cascade its metrics/events/anomalies away.

WITH ranked AS (
    SELECT id,
           first_value(id) OVER (PARTITION BY name ORDER BY id) AS keep_id,
           row_number()    OVER (PARTITION BY name ORDER BY id) AS rn
    FROM services
)
UPDATE metrics m
SET service_id = r.keep_id
FROM ranked r
WHERE m.service_id = r.id
  AND r.rn > 1;

WITH ranked AS (
    SELECT id,
           first_value(id) OVER (PARTITION BY name ORDER BY id) AS keep_id,
           row_number()    OVER (PARTITION BY name ORDER BY id) AS rn
    FROM services
)
UPDATE events e
SET service_id = r.keep_id
FROM ranked r
WHERE e.service_id = r.id
  AND r.rn > 1;

WITH ranked AS (
    SELECT id,
           first_value(id) OVER (PARTITION BY name ORDER BY id) AS keep_id,
           row_number()    OVER (PARTITION BY name ORDER BY id) AS rn
    FROM services
)
UPDATE anomalies a
SET service_id = r.keep_id
FROM ranked r
WHERE a.service_id = r.id
  AND r.rn > 1;

WITH ranked AS (
    SELECT id,
           row_number() OVER (PARTITION BY name ORDER BY id) AS rn
    FROM services
)
DELETE FROM services s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- ------------------------------------------------------------
-- 3. UNIQUE(name), so ON CONFLICT (name) has a target
-- ------------------------------------------------------------

DO $add_unique$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'services'::regclass
          AND contype  = 'u'
          AND conname  = 'services_name_key'
    ) THEN
        ALTER TABLE services
            ADD CONSTRAINT services_name_key UNIQUE (name);
        RAISE NOTICE 'added services_name_key';
    END IF;
END
$add_unique$;

-- ------------------------------------------------------------
-- 4. Index matching the real access pattern
-- ------------------------------------------------------------
-- "latest N metrics for service X" cannot use two separate
-- single-column indexes as an ordered range scan.

CREATE INDEX IF NOT EXISTS idx_metrics_service_recorded
    ON metrics(service_id, recorded_at DESC);

DROP INDEX IF EXISTS idx_metrics_service_id;
DROP INDEX IF EXISTS idx_metrics_recorded_at;

COMMIT;
