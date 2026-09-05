#!/usr/bin/env node
"use strict";
// Tum davranis testlerini sirayla calistirir. `yarn test` bunu cagirir.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".test.js")).sort();
let failed = 0;
for (const f of files) {
  try {
    process.stdout.write(execFileSync(process.execPath, [path.join(dir, f)], { encoding: "utf8" }));
  } catch (e) {
    failed += 1;
    process.stdout.write(e.stdout || "");
    process.stderr.write(e.stderr || "");
  }
}
console.log(`\n==================================\n${files.length} dosya calisti, ${failed} basarisiz.`);
process.exit(failed > 0 ? 1 : 0);
