-- Imported bank transactions (used for expense categorization + subscription detection).
CREATE TABLE IF NOT EXISTS transactions (
    id          BIGSERIAL     PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tx_date     DATE          NOT NULL,
    description VARCHAR(255)  NOT NULL,
    merchant    VARCHAR(120),
    amount      NUMERIC(15,2) NOT NULL,          -- negative = expense, positive = income
    category    VARCHAR(20),                     -- ExpenseCategory name, null for income
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_tx_user_merchant ON transactions(user_id, merchant);
