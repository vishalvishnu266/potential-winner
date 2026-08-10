-- completions: one row per finished job.
--
-- This is the only persistent record of a job.  The job body itself
-- lives only in memory (see server/src/jobs.rs) and is dropped once
-- the 4-step Done+Paid handshake finishes.
--
-- Ratings are stored here rather than in a separate table so the
-- "job ↔ rating" invariant (one rating per party per job) is enforced
-- by structure.

CREATE TABLE IF NOT EXISTS completions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id            TEXT NOT NULL,
    requester_id      TEXT NOT NULL,
    doer_id           TEXT NOT NULL,
    category          TEXT NOT NULL,
    completed_at      INTEGER NOT NULL,
    payment_method    TEXT NOT NULL DEFAULT 'unpaid',   -- 'upi'|'cash'|'unpaid'
    payment_disputed  INTEGER NOT NULL DEFAULT 0,       -- 0 / 1
    requester_rating  INTEGER,                          -- 1=sad 2=meh 3=happy
    doer_rating       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_completions_doer
    ON completions(doer_id);

CREATE INDEX IF NOT EXISTS idx_completions_requester
    ON completions(requester_id);
