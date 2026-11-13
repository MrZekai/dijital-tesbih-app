"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const original = require.extensions[".ts"];
require.extensions[".ts"] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename,"utf8"), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText,filename);
const { readState, createStateWriter } = require("../src/lib/persistence.ts");
const { defaultState, migrateState } = require("../src/lib/migration.ts");
require.extensions[".ts"] = original;

async function main() {
  const saved=defaultState(); saved.totalCount=100; saved.dhikrStates.subhanallah.count=100;
  for (const raw of [JSON.stringify(saved),JSON.stringify(JSON.stringify(saved))]) {
    assert.equal((await readState({getItem:async()=>raw})).totalCount,100);
  }
  assert.equal((await readState({getItem:async()=>null})).totalCount,0);
  for (const raw of ['{broken','null',JSON.stringify({version:999})]) {
    await assert.rejects(()=>readState({getItem:async()=>raw}));
  }
  await assert.rejects(()=>readState({getItem:async()=>{throw Error('temporary read failure');}}));
  const malformed = migrateState({...saved,customDhikrs:[{id:'custom-1',name:'Example',defaultTarget:33}],dhikrStates:{'custom-1':{count:'5',target:-1}},settings:{dailyGoal:-1,reminderHour:99,reminderMinute:NaN},dailyLog:{'2026-11-13':{total:'7',perDhikr:{'custom-1':'7'}}}});
  assert.equal(malformed.dhikrStates['custom-1'].count,5);
  assert.equal(malformed.settings.dailyGoal,100);
  assert.equal(malformed.settings.reminderHour,23);
  assert.equal(malformed.dailyLog['2026-11-13'].total,7);

  const writes=[];let release;const errors=[];
  const writer=createStateWriter({setItem:async(_key,raw)=>{writes.push(JSON.parse(JSON.parse(raw)));if(writes.length===1)await new Promise(resolve=>{release=resolve;});}},failed=>errors.push(failed));
  writer.enqueue({...saved,totalCount:101});const running=writer.flush();
  writer.enqueue({...saved,totalCount:102});writer.enqueue({...saved,totalCount:103});
  assert.equal(writes.length,1,'never write concurrently');
  release();await running;
  assert.deepEqual(writes.map(s=>s.totalCount),[101,103],'latest queued state wins');writer.dispose();
  let fail=true;const retryWrites=[];const failures=[];
  const retryWriter=createStateWriter({setItem:async(_key,raw)=>{if(fail)throw Error('disk full');retryWrites.push(JSON.parse(JSON.parse(raw)));}},failed=>failures.push(failed));
  retryWriter.enqueue(saved);await retryWriter.flush();assert.deepEqual(failures,[true]);
  fail=false;retryWriter.enqueue({...saved,totalCount:104});await retryWriter.retry();
  assert.deepEqual(failures,[true,false]);assert.equal(retryWrites[0].totalCount,104);retryWriter.dispose();

  // Evaluate the exact resume condition used by the screen.
  const source=fs.readFileSync(require('node:path').join(__dirname,'../app/tesbihat.tsx'),'utf8');
  const expression=source.match(/const resumable =([\s\S]*?);/)[1];
  const vm=require('node:vm');
  for(const stepIdx of [1,2]) assert.equal(vm.runInNewContext(expression,{saved:{stepIdx,count:0,updatedAt:Date.now()},STEPS:[{target:33},{target:33},{target:33}],RESUME_MAX_AGE_MS:43200000,Date}),true);
  console.log('  ok   legacy reads, failed-read preservation, serial/retry writes, migration validation and 33/66 resume');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
