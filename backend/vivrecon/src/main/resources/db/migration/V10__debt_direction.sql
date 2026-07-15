-- Direction of a debt: false = I owe it, true = I lent it to someone (they owe me).
ALTER TABLE debts ADD COLUMN IF NOT EXISTS lent BOOLEAN NOT NULL DEFAULT FALSE;
