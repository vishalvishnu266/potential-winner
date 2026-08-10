-- users: one row per authenticated phone number.
--
-- Columns kept intentionally small; anything optional (photo, UPI ID,
-- language preference) is added via a later migration prefixed with
-- `..__users__add_*.sql` so the full history for this table stays
-- greppable via  `ls migrations/*__users__*.sql`.

CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,             -- uuid v4
    phone         TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    upi_id        TEXT,                         -- optional
    prefers_cash  INTEGER NOT NULL DEFAULT 0,   -- 0 / 1
    kyc_tier      INTEGER NOT NULL DEFAULT 0,   -- 0=phone,1=id,2=skill
    created_at    INTEGER NOT NULL              -- ms since epoch
);
