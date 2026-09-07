/*
 * copy-runtime.js
 *
 * Copies wasm_exec.js from the local Go SDK into ./dist so Capacitor
 * can bundle it. `go env GOROOT` is used to locate the SDK.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function findWasmExec() {
  const goroot = execSync("go env GOROOT").toString().trim();
  const candidates = [
    path.join(goroot, "misc", "wasm", "wasm_exec.js"),
    path.join(goroot, "lib", "wasm", "wasm_exec.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("wasm_exec.js not found in " + candidates.join(", "));
}

const src = findWasmExec();
fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync(src, path.join("dist", "wasm_exec.js"));
console.log("copied", src, "-> dist/wasm_exec.js");
