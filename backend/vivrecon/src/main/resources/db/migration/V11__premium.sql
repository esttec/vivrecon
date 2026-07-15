-- Paid premium access (null = not subscribed; a future date = active).
ALTER TABLE users ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
