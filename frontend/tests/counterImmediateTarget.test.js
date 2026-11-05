"use strict";

// Simulate React deferring state commits: consecutive taps must still count
// separately, and the target feedback must be returned on the target tap.
const assert = require("assert");
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const originalLoad = Module._load;
const originalTs = require.extensions[".ts"];
const originalTsx = require.extensions[".tsx"];
const scheduled = [];
let currentValue;
const react = {
  createContext: () => ({ Provider: "provider" }),
  createElement: (_type, props) => {
    currentValue = props.value;
    return null;
  },
  useState: (initial) => [typeof initial === "function" ? initial() : initial, (next) => scheduled.push(next)],
  useRef: (initial) => ({ current: initial }),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useContext: () => currentValue,
};

function loadTypeScript(mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  mod._compile(js, filename);
}

try {
  require.extensions[".ts"] = loadTypeScript;
  require.extensions[".tsx"] = loadTypeScript;
  Module._load = function (request, parent, isMain) {
    if (request === "react") return react;
    if (request === "react-native") return { AppState: { addEventListener: () => ({ remove() {} }) }, useColorScheme: () => "dark" };
    if (request === "@/src/utils/storage") return { storage: { getItem: async () => null, setItem: () => {} } };
    return originalLoad.call(this, request, parent, isMain);
  };

  const { StoreProvider } = require(path.join(__dirname, "../src/lib/store.tsx"));
  StoreProvider({ children: null });
  for (let tap = 1; tap <= 34; tap++) {
    const result = currentValue.increment();
    assert.strictEqual(result.justReachedTarget, tap === 33, `tap ${tap} target feedback`);
  }
  assert.strictEqual(scheduled.length, 34, "one state update per tap");
  assert.strictEqual(scheduled[33].dhikrStates.subhanallah.count, 34, "no dropped taps before React commit");
  assert.strictEqual(scheduled[33].totalCount, 34, "global total stays in sync");
  assert.strictEqual(currentValue.undo(), true);
  assert.strictEqual(scheduled[34].dhikrStates.subhanallah.count, 33, "undo sees latest tap");
  currentValue.reset();
  assert.strictEqual(scheduled[35].dhikrStates.subhanallah.count, 0, "reset sees latest count");
  currentValue.increment();
  assert.strictEqual(scheduled[36].dhikrStates.subhanallah.count, 1, "next tap starts from reset count");
  console.log("  ok   consecutive taps and target feedback before React commit");
} finally {
  Module._load = originalLoad;
  require.extensions[".ts"] = originalTs;
  require.extensions[".tsx"] = originalTsx;
}
