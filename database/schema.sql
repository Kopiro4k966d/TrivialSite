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
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key VARCHAR(96) NOT NULL UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'unused',
  duration_days INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0),
  created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  used_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses(status);
