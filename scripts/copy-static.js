/*
 * copy-static.js
 *
 * Assembles ./dist with the static assets Capacitor will bundle:
 *   dist/
 *     index.html
 *     app.wasm         (already built by build:wasm)
 *     wasm_exec.js     (already copied by copy-runtime)
 *     web/css/*.css
 */
const fs = require("fs");
const path = require("path");

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

fs.mkdirSync("dist", { recursive: true });
copyRecursive("web", path.join("dist", "web"));
fs.copyFileSync("web/index.html", path.join("dist", "index.html"));
console.log("static assets copied to dist/");
