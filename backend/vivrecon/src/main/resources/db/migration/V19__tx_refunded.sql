-- Card refunds are paired with the original purchase and both left out of the budget.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS refunded BOOLEAN NOT NULL DEFAULT FALSE;
