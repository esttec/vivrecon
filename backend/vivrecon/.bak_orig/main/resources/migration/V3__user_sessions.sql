CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    device_id TEXT NOT NULL,
    device_name TEXT NULL,
    user_agent TEXT NULL,
    ip TEXT NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_sessions_user_device
        UNIQUE (user_id, device_id)
);

-- Link refresh tokens to a session
ALTER TABLE refresh_tokens ADD COLUMN session_id BIGINT;

-- Backfill existing refresh tokens into a legacy session (safe for your current dev DB)
INSERT INTO user_sessions (user_id, device_id, device_name, created_at, last_used_at)
SELECT DISTINCT user_id, 'legacy', 'legacy', now(), now()
FROM refresh_tokens
ON CONFLICT (user_id, device_id) DO NOTHING;

UPDATE refresh_tokens rt
SET session_id = us.id
FROM user_sessions us
WHERE us.user_id = rt.user_id AND us.device_id = 'legacy'
  AND rt.session_id IS NULL;

ALTER TABLE refresh_tokens ALTER COLUMN session_id SET NOT NULL;

ALTER TABLE refresh_tokens
ADD CONSTRAINT fk_refresh_tokens_session
FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE;

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);
