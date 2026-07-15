-- Stripe billing identifiers so webhooks can map events back to a user.
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id     VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
