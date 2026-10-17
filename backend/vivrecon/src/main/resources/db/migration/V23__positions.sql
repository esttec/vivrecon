-- Investment and trading positions the user enters by hand (open = no close_date yet).
CREATE TABLE positions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        VARCHAR(10)   NOT NULL,                 -- INVEST | TRADE
    asset       VARCHAR(120)  NOT NULL,
    direction   VARCHAR(5)    NOT NULL DEFAULT 'LONG',  -- LONG | SHORT
    open_date   DATE          NOT NULL,
    close_date  DATE,
    qty         NUMERIC(20,8) NOT NULL,
    open_price  NUMERIC(20,8) NOT NULL,
    close_price NUMERIC(20,8),
    fees        NUMERIC(15,2) NOT NULL DEFAULT 0,
    note        VARCHAR(255)
);
CREATE INDEX ix_positions_user ON positions(user_id, kind);
