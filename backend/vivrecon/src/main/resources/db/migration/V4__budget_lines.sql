CREATE TABLE IF NOT EXISTS budget_lines (
    id          BIGSERIAL    PRIMARY KEY,
    budget_id   BIGINT       NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    type        VARCHAR(10)  NOT NULL,
    category    VARCHAR(20),
    description VARCHAR(255) NOT NULL,
    amount      NUMERIC(15,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id);

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS total_income NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS balance NUMERIC(15,2) NOT NULL DEFAULT 0;