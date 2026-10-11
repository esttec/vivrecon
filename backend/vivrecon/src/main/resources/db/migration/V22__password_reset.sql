-- One-time password reset links. Only a SHA-256 of the token is stored.
CREATE TABLE password_reset_tokens (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
