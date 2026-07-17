-- Children and their individual expenses. Each child is tracked separately.
CREATE TABLE IF NOT EXISTS children (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);

CREATE TABLE IF NOT EXISTS child_expenses (
    id         BIGSERIAL     PRIMARY KEY,
    child_id   BIGINT        NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    name       VARCHAR(255)  NOT NULL,
    amount     NUMERIC(15,2) NOT NULL,
    year_month VARCHAR(7)    NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_child_expenses_child_month ON child_expenses(child_id, year_month);
