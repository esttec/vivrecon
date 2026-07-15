-- User financial accounts (cash, bank, investment) for balance management.
CREATE TABLE IF NOT EXISTS accounts (
    id         BIGSERIAL     PRIMARY KEY,
    user_id    BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100)  NOT NULL,
    type       VARCHAR(20)   NOT NULL,          -- CASH, BANK, INVESTMENT
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
