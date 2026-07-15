-- V1__initial_schema.sql

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id                    BIGSERIAL PRIMARY KEY,
    email                 VARCHAR(255) NOT NULL UNIQUE,
    password_hash         VARCHAR(255) NOT NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    disclaimer_accepted   BOOLEAN      NOT NULL DEFAULT FALSE,
    disclaimer_accepted_at TIMESTAMPTZ
);

-- ── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
    id                    BIGSERIAL PRIMARY KEY,
    user_id               BIGINT       NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name          VARCHAR(100),
    currency              VARCHAR(10)  NOT NULL DEFAULT 'EUR',
    monthly_income        NUMERIC(15,2),
    savings_target_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00
);

-- ── Refresh Tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id         BIGSERIAL   PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked    BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── User Sessions ─────────────────────────────────────────────────────────────
CREATE TABLE user_sessions (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_info  VARCHAR(512) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active       BOOLEAN     NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, active);

-- ── Budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE budgets (
    id             BIGSERIAL    PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year_month     VARCHAR(7)   NOT NULL,          -- "YYYY-MM"
    total_income   NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    UNIQUE(user_id, year_month)
);

CREATE TABLE budget_lines (
    id          BIGSERIAL    PRIMARY KEY,
    budget_id   BIGINT       NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    type        VARCHAR(10)  NOT NULL,   -- INCOME | EXPENSE
    category    VARCHAR(20),            -- ExpenseCategory enum
    description VARCHAR(255) NOT NULL,
    amount      NUMERIC(15,2) NOT NULL
);
CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);

-- ── House Expenses ────────────────────────────────────────────────────────────
CREATE TABLE house_expenses (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expense_type VARCHAR(30)  NOT NULL,
    name         VARCHAR(255) NOT NULL,
    amount       NUMERIC(15,2) NOT NULL,
    year_month   VARCHAR(7)   NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_house_expenses_user_month ON house_expenses(user_id, year_month);

-- ── Meal Plans ────────────────────────────────────────────────────────────────
CREATE TABLE meal_plans (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE        NOT NULL,
    weekly_budget   NUMERIC(15,2)
);
CREATE INDEX idx_meal_plans_user ON meal_plans(user_id);

CREATE TABLE meal_plan_entries (
    id           BIGSERIAL   PRIMARY KEY,
    meal_plan_id BIGINT      NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    day_of_week  INTEGER     NOT NULL,   -- 1=Mon … 7=Sun
    meal_type    VARCHAR(20) NOT NULL,   -- BREAKFAST, LUNCH, DINNER, SNACK
    description  TEXT        NOT NULL
);

-- ── Shopping Lists ────────────────────────────────────────────────────────────
CREATE TABLE shopping_lists (
    id           BIGSERIAL    PRIMARY KEY,
    meal_plan_id BIGINT       NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    store_name   VARCHAR(100) NOT NULL,
    is_cheapest  BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE shopping_list_items (
    id               BIGSERIAL    PRIMARY KEY,
    shopping_list_id BIGINT       NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
    product_name     VARCHAR(255) NOT NULL,
    quantity         VARCHAR(50)  NOT NULL,
    price_estimate   NUMERIC(10,2),
    checked          BOOLEAN      NOT NULL DEFAULT FALSE
);

-- ── Pantry ────────────────────────────────────────────────────────────────────
CREATE TABLE pantry_items (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    quantity    VARCHAR(50)  NOT NULL,
    location    VARCHAR(20)  NOT NULL DEFAULT 'PANTRY',  -- FRIDGE, FREEZER, PANTRY
    expiry_date DATE
);
CREATE INDEX idx_pantry_user ON pantry_items(user_id);

-- ── Clothing Items ────────────────────────────────────────────────────────────
CREATE TABLE clothing_items (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name        VARCHAR(255) NOT NULL,
    description      TEXT,
    preferred_fabric VARCHAR(30),
    max_budget       NUMERIC(10,2),
    actual_price     NUMERIC(10,2),
    store_name       VARCHAR(100),
    status           VARCHAR(20)  NOT NULL DEFAULT 'NEEDED',
    year_month       VARCHAR(7)   NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_clothing_user_month ON clothing_items(user_id, year_month);

-- ── Trips ─────────────────────────────────────────────────────────────────────
CREATE TABLE trips (
    id                    BIGSERIAL    PRIMARY KEY,
    user_id               BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination           VARCHAR(255) NOT NULL,
    departure_from        VARCHAR(255),
    start_date            DATE,
    end_date              DATE,
    total_budget          NUMERIC(15,2),
    status                VARCHAR(20)  NOT NULL DEFAULT 'PLANNING',
    selected_hotel        VARCHAR(255),
    hotel_price_per_night NUMERIC(10,2),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scanned_at       TIMESTAMPTZ
);
CREATE INDEX idx_trips_user ON trips(user_id);

-- ── Travel Offers ─────────────────────────────────────────────────────────────
CREATE TABLE travel_offers (
    id         BIGSERIAL    PRIMARY KEY,
    trip_id    BIGINT       NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    offer_type VARCHAR(20)  NOT NULL,    -- FLIGHT, TRAIN, BUS, HOTEL, PACKAGE
    provider   VARCHAR(100) NOT NULL,
    title      VARCHAR(255) NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    url        VARCHAR(2048),
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    selected   BOOLEAN     NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_travel_offers_trip ON travel_offers(trip_id);
