# DailyGig — Dev Seeder

A **completely standalone** static HTML page for pumping mock jobs and
workers into a running DailyGig server.

## Why this exists

- ✅ **Keeps the server lean** — the server has no test-only endpoints
  or fixture data.  All seeding logic lives here.
- ✅ **Uses only the public API** (`POST /api/jobs`,
  `POST /api/heartbeat`) — the same endpoints the mobile app hits, so
  we exercise the exact same code paths.
- ✅ **No build step, no npm install** — one HTML file, plain JS.
- ✅ **Hostable anywhere** — GitHub Pages, S3, `python3 -m http.server`.

## Running

```bash
# Fastest — npm script
npm run seed:web
# → open http://localhost:5173

# Or Python
python3 -m http.server -d seed-web 5173

# Or just open the file
open seed-web/index.html
```

## Using

1. Enter your server URL (e.g. `http://192.168.0.4:3000`) and click **Ping**.
2. Click **📍 Use my browser location** or type lat/lon manually.
3. Adjust radius / job count / worker count.
4. (Optional) Tick **Re-fire heartbeats every 60 s** to keep the seeded
   workers "online" during a longer test session.
5. Click **🌱 Seed now**.

All values are cached in `localStorage` between visits.

## Note on sponsors

Sponsors are the only category that lives in SQLite (they need to
persist across restarts).  There's no public write API, so add them
manually:

```bash
sqlite3 server/data/app.sqlite <<'SQL'
INSERT INTO sponsors (name, category, phone, photo_url, lat, lon, radius_km, active_until)
VALUES ('Sharma Auto Repair', 'mechanic', '+919876543210', NULL,
        13.0827, 80.2707, 10,
        strftime('%s','now','+30 days') * 1000);
SQL
```

Or run the same INSERT from your favourite SQLite GUI.

## Also available: CLI variant

If you'd rather stay in a terminal, `scripts/seed.mjs` does the same
thing:

```bash
npm run seed -- --lat 13.0827 --lon 80.2707
```
