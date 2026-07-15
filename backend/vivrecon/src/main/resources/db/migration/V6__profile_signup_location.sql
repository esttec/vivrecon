-- Capture where a client signed up from.
-- signup_ip: raw client IP recorded at account creation (IPv4 or IPv6).
-- country:   ISO 3166-1 alpha-2 code, resolved from the IP later/offline (nullable for now).

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS signup_ip VARCHAR(45);

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country VARCHAR(2);
