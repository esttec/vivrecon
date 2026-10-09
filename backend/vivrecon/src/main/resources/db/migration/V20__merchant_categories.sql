-- Category a user picked for a shop; future bank imports put that shop there automatically.
CREATE TABLE IF NOT EXISTS merchant_categories (
    id       BIGSERIAL    PRIMARY KEY,
    user_id  BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant VARCHAR(255) NOT NULL,   -- lower-cased shop name as it appears in the statement
    category VARCHAR(20)  NOT NULL,
    UNIQUE (user_id, merchant)
);
