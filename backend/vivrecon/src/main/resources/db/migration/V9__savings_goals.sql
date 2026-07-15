-- Savings goals the user is putting money towards.
CREATE TABLE IF NOT EXISTS savings_goals (
    id            BIGSERIAL     PRIMARY KEY,
    user_id       BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(255)  NOT NULL,
    target_amount NUMERIC(15,2) NOT NULL,
    saved_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
