-- Debts the user is paying down.
CREATE TABLE IF NOT EXISTS debts (
    id           BIGSERIAL     PRIMARY KEY,
    user_id      BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255)  NOT NULL,
    total_amount NUMERIC(15,2) NOT NULL,
    paid_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user ON debts(user_id);
