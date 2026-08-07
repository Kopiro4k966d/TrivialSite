-- Trivial Site schema v4. Safe to run repeatedly on PostgreSQL.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('trivial-site-schema-v4'));

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(24) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'user',
  subscription_until TIMESTAMPTZ NULL,
  hwid VARCHAR(128) NULL,
  avatar TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(24) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_until TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hwid VARCHAR(128) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
UPDATE users SET role='user' WHERE role IS NULL OR BTRIM(role)='';
UPDATE users SET created_at=NOW() WHERE created_at IS NULL;
CREATE SEQUENCE IF NOT EXISTS users_id_seq;
ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
SELECT setval('users_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM users), 0) + 1, 1), false);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_subscription_until_idx ON users(subscription_until);

-- Compatibility with older builds that stored expiry in users.subscription.
DO $$
DECLARE
  item RECORD;
  raw_value TEXT;
  epoch_value DOUBLE PRECISION;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='users' AND column_name='subscription'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE users ALTER COLUMN subscription DROP NOT NULL';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    FOR item IN EXECUTE
      'SELECT id, subscription::text AS raw_value FROM users WHERE subscription_until IS NULL AND subscription IS NOT NULL'
    LOOP
      raw_value := BTRIM(item.raw_value);
      IF raw_value IS NULL OR raw_value = '' OR LOWER(raw_value) IN ('null','false','f','inactive','none') THEN
        CONTINUE;
      END IF;

      BEGIN
        IF raw_value ~ '^[0-9]+([.][0-9]+)?$' THEN
          epoch_value := raw_value::double precision;
          IF epoch_value > 100000000000 THEN
            epoch_value := epoch_value / 1000.0;
          END IF;
          IF epoch_value > 1000000000 THEN
            UPDATE users SET subscription_until=to_timestamp(epoch_value) WHERE id=item.id;
          END IF;
        ELSE
          UPDATE users SET subscription_until=raw_value::timestamptz WHERE id=item.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key VARCHAR(96) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'unused',
  duration_days INTEGER NOT NULL DEFAULT 30,
  created_by BIGINT NULL,
  used_by BIGINT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL
);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_key VARCHAR(96);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'unused';
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS used_by BIGINT NULL;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL;

-- Normalize incompatible legacy column types.
DO $$
DECLARE column_type TEXT;
BEGIN
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='license_key';
  IF column_type IS NOT NULL AND column_type NOT IN ('character varying','character','text') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='license_key_legacy_v4'
    ) THEN
      ALTER TABLE licenses RENAME COLUMN license_key TO license_key_legacy_v4;
    ELSE
      ALTER TABLE licenses DROP COLUMN license_key;
    END IF;
    ALTER TABLE licenses ADD COLUMN license_key VARCHAR(96);
    UPDATE licenses SET license_key=UPPER(BTRIM(license_key_legacy_v4::text)) WHERE license_key_legacy_v4 IS NOT NULL;
  END IF;

  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='status';
  IF column_type IS NOT NULL AND column_type NOT IN ('character varying','character','text') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='status_legacy_v4'
    ) THEN
      ALTER TABLE licenses RENAME COLUMN status TO status_legacy_v4;
    ELSE
      ALTER TABLE licenses DROP COLUMN status;
    END IF;
    ALTER TABLE licenses ADD COLUMN status VARCHAR(16) DEFAULT 'unused';
    UPDATE licenses
    SET status=CASE
      WHEN LOWER(BTRIM(status_legacy_v4::text)) IN ('1','true','t','yes','used','redeemed','activated') THEN 'used'
      ELSE 'unused'
    END;
  END IF;

  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='duration_days';
  IF column_type IS NOT NULL AND column_type NOT IN ('smallint','integer','bigint','numeric','decimal') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='duration_days_legacy_v4'
    ) THEN
      ALTER TABLE licenses RENAME COLUMN duration_days TO duration_days_legacy_v4;
    ELSE
      ALTER TABLE licenses DROP COLUMN duration_days;
    END IF;
    ALTER TABLE licenses ADD COLUMN duration_days INTEGER DEFAULT 30;
    UPDATE licenses
    SET duration_days=CASE
      WHEN BTRIM(duration_days_legacy_v4::text) ~ '^[0-9]+$'
        THEN LEAST(3650, GREATEST(1, BTRIM(duration_days_legacy_v4::text)::integer))
      ELSE 30
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='key'
  ) THEN
    EXECUTE 'UPDATE licenses SET license_key=UPPER(BTRIM("key"::text)) WHERE license_key IS NULL AND "key" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='duration'
  ) THEN
    EXECUTE 'UPDATE licenses SET duration_days=CASE WHEN BTRIM("duration"::text) ~ ''^[0-9]+$'' THEN LEAST(3650, GREATEST(1, BTRIM("duration"::text)::integer)) ELSE 30 END WHERE duration_days IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema=current_schema() AND table_name='licenses' AND column_name='used'
  ) THEN
    EXECUTE 'UPDATE licenses SET status=CASE WHEN LOWER(BTRIM("used"::text)) IN (''1'',''true'',''t'',''yes'',''used'') THEN ''used'' ELSE ''unused'' END WHERE status IS NULL';
  END IF;
END $$;

UPDATE licenses SET license_key=UPPER(BTRIM(license_key)) WHERE license_key IS NOT NULL;
UPDATE licenses
SET license_key=CONCAT('TRIV-LEGACY-', id::text)
WHERE license_key IS NULL OR BTRIM(license_key)='';
UPDATE licenses SET status=LOWER(BTRIM(status)) WHERE status IS NOT NULL;
UPDATE licenses SET status='unused' WHERE status IS NULL OR BTRIM(status)='' OR status IN ('new','available','active','false','0');
UPDATE licenses SET status='used' WHERE status IN ('true','1','redeemed','activated');
UPDATE licenses SET duration_days=30 WHERE duration_days IS NULL OR duration_days < 1;
UPDATE licenses SET duration_days=3650 WHERE duration_days > 3650;
UPDATE licenses SET created_at=NOW() WHERE created_at IS NULL;

WITH ranked AS (
  SELECT ctid, id, license_key,
         ROW_NUMBER() OVER (PARTITION BY license_key ORDER BY id) AS duplicate_number
  FROM licenses
)
UPDATE licenses AS target
SET license_key=LEFT(target.license_key, 70) || '-DUP-' || ranked.id::text
FROM ranked
WHERE target.ctid=ranked.ctid AND ranked.duplicate_number > 1;

CREATE SEQUENCE IF NOT EXISTS licenses_id_seq;
ALTER SEQUENCE licenses_id_seq OWNED BY licenses.id;
ALTER TABLE licenses ALTER COLUMN id SET DEFAULT nextval('licenses_id_seq');
SELECT setval('licenses_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM licenses), 0) + 1, 1), false);
ALTER TABLE licenses ALTER COLUMN license_key SET NOT NULL;
ALTER TABLE licenses ALTER COLUMN status SET DEFAULT 'unused';
ALTER TABLE licenses ALTER COLUMN duration_days SET DEFAULT 30;
ALTER TABLE licenses ALTER COLUMN created_at SET DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS licenses_license_key_uq ON licenses(license_key);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses(status);

COMMIT;
