-- Bank's own id for a transaction (archive code, e.g. Luminor "B0602KJJ"): a row is registered once, however often a statement is imported.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_ref VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transactions_user_bank_ref ON transactions(user_id, bank_ref) WHERE bank_ref IS NOT NULL;
