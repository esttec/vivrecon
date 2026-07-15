-- V2__oauth_provider_columns.sql
-- Adds social auth columns to the users table.
-- password_hash becomes nullable (social-only accounts have no password).

-- Make password_hash nullable for social sign-in accounts
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Add provider identifier (LOCAL | GOOGLE | APPLE | FACEBOOK)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS provider    VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_url  VARCHAR(512);

-- Unique constraint: a given provider+provider_id pair maps to exactly one account
ALTER TABLE users
    ADD CONSTRAINT uk_users_provider UNIQUE (provider, provider_id);

-- Index for fast lookup during social login
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
