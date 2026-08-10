# Migrations

Run automatically at server startup via `sqlx::migrate!("./migrations")`.

## Naming convention

```
<yyyymmddHHMMSS>__<table>__<change>.sql
```

- **Timestamp prefix** — sqlx runs files in lexicographic order, so the
  prefix must sort chronologically. Use UTC.
- **Double underscore** (`__`) after the timestamp — makes it easy to
  strip the prefix in editors / to `ls | cut -d_ -f4-` when grouping.
- **Table name** in the middle — every migration must touch a single
  table so `grep users__ migrations/` gives you the full history of
  that table at a glance.
- **Short change description** — verb-first, snake_case:
  `add_upi_id`, `add_unique_phone`, `drop_deprecated_col`.

## Examples

```
20260809100000__users__create.sql
20260809100001__completions__create.sql
20260809100002__sponsors__create.sql

# Later, adding a column? Same table prefix, new timestamp:
20260901120000__users__add_photo_url.sql
20260910090000__completions__add_dispute_reason.sql
```

## Rules

1. **Never edit an applied migration.** Add a new one instead — sqlx
   records the checksum of each file and will refuse to start if a
   file's contents change after being applied.
2. **One table per file.** Cross-table changes (foreign keys, joins)
   go under the table that owns the constraint.
3. **Idempotency is welcome but not required** — sqlx tracks which
   files have run in the `_sqlx_migrations` table it creates.
4. **Indexes live with their table** — put `CREATE INDEX` for a table
   in the same migration that adds the column being indexed.
5. **SQLite ALTER quirks**: SQLite can `ADD COLUMN` freely, but cannot
   drop / rename columns without a table rebuild. If you need to
   restructure, write a migration that:
     - creates `users_new` with the new shape,
     - `INSERT INTO users_new SELECT ... FROM users;`,
     - `DROP TABLE users;`,
     - `ALTER TABLE users_new RENAME TO users;`
   and add all indexes back at the end.

## Quick grouping commands

```bash
# All migrations that touch the `users` table:
ls migrations/*__users__*.sql

# Full history for one table in order:
ls migrations/*__users__*.sql | sort
```
