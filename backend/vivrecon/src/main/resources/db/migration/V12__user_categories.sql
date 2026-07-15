-- User-defined categories and subcategories for income and expenses.
CREATE TABLE IF NOT EXISTS user_categories (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    kind       VARCHAR(10)  NOT NULL,          -- INCOME or EXPENSE
    parent_id  BIGINT       REFERENCES user_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_categories_user ON user_categories(user_id);
