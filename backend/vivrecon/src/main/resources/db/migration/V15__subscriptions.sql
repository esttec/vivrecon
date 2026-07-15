-- Manually-added subscriptions (auto-detected ones are computed from transactions).
CREATE TABLE IF NOT EXISTS subscriptions (
    id          BIGSERIAL     PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(120)  NOT NULL,
    category    VARCHAR(20),
    amount      NUMERIC(15,2) NOT NULL,
    billing_day INT           NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
