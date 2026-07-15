-- Deadline + optional monthly payment schedule for debts.
ALTER TABLE debts ADD COLUMN IF NOT EXISTS due_date        DATE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(15,2);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS payment_day     INTEGER;
