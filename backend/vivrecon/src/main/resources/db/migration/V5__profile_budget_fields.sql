-- V5__profile_budget_fields.sql
-- Monthly budget planning fields on profile

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS rent_budget           NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS food_budget           NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS transport_budget      NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS debt_payments         NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS other_fixed_expenses  NUMERIC(15,2);
