-- sponsors: paid local business listings surfaced in nearby feeds.
--
-- Filtering rules:
--   - `active_until` (ms since epoch) is checked at query time so an
--     expired listing simply stops appearing — no cron job needed.
--   - `radius_km` is the sponsor's *own* reach; users only see a sponsor
--     when their location is within that radius of (lat, lon).

CREATE TABLE IF NOT EXISTS sponsors (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL,
    phone         TEXT,
    photo_url     TEXT,
    lat           REAL NOT NULL,
    lon           REAL NOT NULL,
    radius_km     REAL NOT NULL,
    active_until  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsors_cat_active
    ON sponsors(category, active_until);
