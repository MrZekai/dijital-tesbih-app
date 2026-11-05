"use strict";

const assert = require("assert");
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const originalLoad = Module._load;
const originalTs = require.extensions[".ts"];
let available = false;
let fileCreated = false;
let shareCalled = false;

try {
  require.extensions[".ts"] = (mod, filename) => {
    const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    mod._compile(js, filename);
  };
  Module._load = function (request, parent, isMain) {
    if (request === "expo-file-system") return {
      Paths: { cache: "/cache" },
      File: class {
        constructor() { this.uri = "/cache/backup.json"; this.exists = false; }
        create() { fileCreated = true; }
        write() {}
      },
    };
    if (request === "expo-sharing") return {
      isAvailableAsync: async () => available,
      shareAsync: async () => { shareCalled = true; },
    };
    if (request === "./migration") return { buildBackup: () => ({ version: 1 }) };
    return originalLoad.call(this, request, parent, isMain);
  };

  const { exportBackup } = require(path.join(__dirname, "../src/lib/backup.ts"));
  (async () => {
    const unsupported = await exportBackup({}, "1.1.0", "Export");
    assert.strictEqual(unsupported.ok, false, "unsupported sharing must not report success");
    assert.strictEqual(fileCreated, false, "do not create an inaccessible cache file");

    available = true;
    const supported = await exportBackup({}, "1.1.0", "Export");
    assert.strictEqual(supported.ok, true);
    assert.strictEqual(fileCreated, true);
    assert.strictEqual(shareCalled, true);
    console.log("  ok   backup export reports success only when sharing opens");
  })().catch((error) => { console.error(error); process.exitCode = 1; });
} finally {
  Module._load = originalLoad;
  require.extensions[".ts"] = originalTs;
}
