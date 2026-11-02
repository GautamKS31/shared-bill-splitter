
-- ==========================================
-- 1. HOMES TABLE
-- ==========================================

CREATE TABLE homes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT ck_homes_name_not_blank
        CHECK (length(trim(name)) > 0)
);


-- ==========================================
-- 2. MEMBERS TABLE
-- ==========================================

CREATE TABLE members (
    id TEXT PRIMARY KEY NOT NULL,
    home_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_members_home
        FOREIGN KEY (home_id)
        REFERENCES homes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_members_name_not_blank
        CHECK (length(trim(name)) > 0),

    CONSTRAINT ck_members_position_nonnegative
        CHECK (typeof(position) = 'integer' AND position >= 0),

    CONSTRAINT uq_members_home_position
        UNIQUE (home_id, position),

    CONSTRAINT uq_members_id_home
        UNIQUE (id, home_id)
);


-- ==========================================
-- 3. BILLS TABLE
-- ==========================================

CREATE TABLE bills (
    id TEXT PRIMARY KEY NOT NULL,
    home_id TEXT NOT NULL,
    title TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bills_home
        FOREIGN KEY (home_id)
        REFERENCES homes(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_bills_title_not_blank
        CHECK (length(trim(title)) > 0),

    CONSTRAINT ck_bills_total_positive_integer
        CHECK (
            typeof(total_cents) = 'integer'
            AND total_cents > 0
        ),

    CONSTRAINT uq_bills_id_home
        UNIQUE (id, home_id)
);


-- ==========================================
-- 4. SHARES TABLE
-- ==========================================

CREATE TABLE shares (
    id TEXT PRIMARY KEY NOT NULL,
    home_id TEXT NOT NULL,
    bill_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    paid_at TEXT DEFAULT NULL,
    idempotency_key TEXT DEFAULT NULL,

    CONSTRAINT fk_shares_bill_home
        FOREIGN KEY (bill_id, home_id)
        REFERENCES bills(id, home_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_shares_member_home
        FOREIGN KEY (member_id, home_id)
        REFERENCES members(id, home_id)
        ON DELETE CASCADE,

    CONSTRAINT uq_shares_bill_member
        UNIQUE (bill_id, member_id),

    CONSTRAINT ck_shares_amount_nonnegative_integer
        CHECK (
            typeof(amount_cents) = 'integer'
            AND amount_cents >= 0
        ),

    CONSTRAINT ck_shares_payment_state
        CHECK (
            (paid_at IS NULL AND idempotency_key IS NULL)
            OR
            (paid_at IS NOT NULL AND idempotency_key IS NOT NULL)
        )
);


-- ==========================================
-- 5. INDEXES
-- ==========================================

CREATE INDEX idx_bills_home
ON bills(home_id);

CREATE INDEX idx_shares_member_home_paid
ON shares(member_id, home_id, paid_at);
