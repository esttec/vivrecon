-- Debt kind (credit card, mortgage, loan, ...) so users can tell debts apart.
ALTER TABLE debts ADD COLUMN kind VARCHAR(32) NOT NULL DEFAULT 'OTHER';
