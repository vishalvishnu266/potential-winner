// make-bundle.mjs — produce a single-zip OTA bundle for @capawesome/capacitor-live-update.
//
// Steps:
//   1. Run `trunk build --release` in ../leptos-app to (re)generate dist/.
//   2. Walk dist/ deterministically and compute a SHA-256 over
//      (relative-path, file-sha256) pairs. That hash is the bundle version.
//   3. Zip the tree into ../axum-server/bundles/<version>.zip (skipping if
//      the zip already exists — same content => same hash).
//   4. Write ../axum-server/bundles/latest.json:
//        { "version": "<hash>", "url": "http://<host>/bundles/<hash>.zip",
//          "artifactType": "zip" }
//
// The axum-server just serves bundles/ as static files; the Leptos client
// polls /latest and hands the URL to LiveUpdate.downloadBundle().
//
// Override the base URL with OTA_BASE_URL env var. Default is the demo IP.

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const LEPTOS_DIR = join(REPO_ROOT, "leptos-app");
const DIST_DIR = join(LEPTOS_DIR, "dist");
const BUNDLES_DIR = join(REPO_ROOT, "axum-server", "bundles");
const BASE_URL = process.env.OTA_BASE_URL ?? "http://192.168.0.5:8080";

function log(msg) {
  process.stdout.write(`[bundle] ${msg}\n`);
}

// ---------- 1. trunk build ----------
log(`trunk build --release  (cwd=${LEPTOS_DIR})`);
execSync("trunk build --release", { cwd: LEPTOS_DIR, stdio: "inherit" });

// ---------- 2. walk dist/ deterministically ----------
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (st.isFile()) {
      out.push(full);
    }
  }
  return out;
}

if (!existsSync(DIST_DIR)) {
  throw new Error(`dist/ not found at ${DIST_DIR} — trunk build must have failed`);
}

const files = walk(DIST_DIR)
  .map((abs) => {
    const rel = relative(DIST_DIR, abs).split(sep).join("/");
    const bytes = readFileSync(abs);
    const sha = createHash("sha256").update(bytes).digest("hex");
    return { abs, rel, bytes, sha };
  })
  .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));

const versionHash = createHash("sha256");
for (const f of files) {
  versionHash.update(f.rel);
  versionHash.update(Buffer.from([0]));
  versionHash.update(f.sha);
  versionHash.update(Buffer.from([0]));
}
const version = versionHash.digest("hex");
log(`computed version ${version.slice(0, 12)}…  (${files.length} files)`);

// ---------- 3. zip ----------
mkdirSync(BUNDLES_DIR, { recursive: true });
const zipPath = join(BUNDLES_DIR, `${version}.zip`);
if (existsSync(zipPath)) {
  log(`bundle already exists, reusing: ${relative(REPO_ROOT, zipPath)}`);
} else {
  const zip = new AdmZip();
  for (const f of files) {
    // Second arg = folder inside the zip; empty string keeps files at the
    // root, with nested paths preserved via the filename argument itself.
    const parts = f.rel.split("/");
    const filename = parts.pop();
    const zipFolder = parts.join("/");
    zip.addFile(
      zipFolder ? `${zipFolder}/${filename}` : filename,
      f.bytes,
    );
  }
  zip.writeZip(zipPath);
  log(`wrote ${relative(REPO_ROOT, zipPath)}`);
}

// ---------- 4. latest.json ----------
const latest = {
  version,
  url: `${BASE_URL}/bundles/${version}.zip`,
  artifactType: "zip",
};
const latestPath = join(BUNDLES_DIR, "latest.json");
writeFileSync(latestPath, JSON.stringify(latest, null, 2) + "\n");
log(`wrote ${relative(REPO_ROOT, latestPath)}`);

log("done. Tap 'Check for update' on the phone.");
