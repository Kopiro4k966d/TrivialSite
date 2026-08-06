-- Trivial Site schema v3. Safe to run repeatedly on PostgreSQL.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('trivial-site-schema-v3'));

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(24) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password TEXT NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'user',
  subscription TIMESTAMPTZ NULL,
  hwid VARCHAR(128) NULL,
  avatar TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(160);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(24) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription TIMESTAMPTZ NULL;
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
    EXECUTE 'UPDATE licenses SET duration_days=CASE WHEN BTRIM("duration"::text) ~ ''^[0-9]+$'' THEN GREATEST(1, BTRIM("duration"::text)::integer) ELSE 30 END WHERE duration_days IS NULL';
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
