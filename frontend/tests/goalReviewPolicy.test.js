const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const path = require("node:path");
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src/lib/goalReviewPolicy.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {exports: exportsObject});
(async () => {
  let raw = null;
  const storage = {getItem: async () => raw, setItem: async (_, value) => { raw = value; }};
  const first = exportsObject.createReviewPolicy(storage);
  const yes = () => true;
  await Promise.all([first.startSession(), first.startSession(), first.completeGoal()]);
  assert.equal(await first.reserve("A", yes), false);
  await first.completeGoal();
  assert.equal(await first.reserve("A", yes), false, "no request in first process");
  const second = exportsObject.createReviewPolicy(storage);
  await second.startSession();
  assert.equal(await second.reserve("A", () => false), false);
  assert.deepEqual(await Promise.all([second.reserve("A", yes), second.reserve("A", yes)]), [true,false]);
  assert.equal(await exportsObject.createReviewPolicy(storage).reserve("A", yes), false);
  assert.equal(await second.reserve("B", yes), true);
  raw = "{";
  await assert.rejects(exportsObject.createReviewPolicy(storage).reserve("C", yes));
  console.log("ok review first session, second target, blocked surface, restart, duplicate and per-version reservation");
})().catch(e => {console.error(e); process.exitCode = 1;});
