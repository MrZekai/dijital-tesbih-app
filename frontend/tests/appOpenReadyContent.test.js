"use strict";
// Execute the actual hook with a controllable SDK and effect scheduler.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/ads/useAppOpenAd.ts'),'utf8'), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},
}).outputText;
function harness() {
  const slots=[]; let cursor=0, queued=[], now=100000, interacted=false;
  let appStateListener;
  const ads=[]; const timers=new Map(); let timerId=0;
  const depsEqual=(a,b)=>a && b && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]));
  const react={
    useState(initial) { const i=cursor++; slots[i]??={value:typeof initial==='function'?initial():initial}; return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}]; },
    useRef(initial) { const i=cursor++; return slots[i]??=( {current:initial} ); },
    useCallback(fn,deps) { const i=cursor++; if(!slots[i]||!depsEqual(slots[i].deps,deps))slots[i]={fn,deps};return slots[i].fn; },
    useEffect(fn,deps) {const i=cursor++;if(!slots[i]||!depsEqual(slots[i].deps,deps)){const old=slots[i];slots[i]={deps};queued.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const adState={canRequestAds:true,consentReady:true,setFullScreenAdActive:()=>{}};
  const sdk={AdEventType:{LOADED:'loaded',ERROR:'error',OPENED:'opened',CLOSED:'closed'},AppOpenAd:{createForAdRequest:()=>{
    const listeners=new Map();const ad={loaded:false,shows:0,load(){},show(){ad.shows++;return Promise.resolve();},addAdEventListener(type,fn){listeners.set(type,fn);return ()=>listeners.delete(type);},removeAllListeners(){listeners.clear();},loadedEvent(){ad.loaded=true;listeners.get('loaded')?.();}};ads.push(ad);return ad;
  }}};
  const mocks={react,'react-native':{AppState:{currentState:'active',addEventListener:(_, fn)=>{appStateListener=fn;return {remove(){}}}}},'@react-native-async-storage/async-storage':{getItem:async()=>null,setItem:async()=>{}},'./AdsProvider':{useAds:()=>adState},'./sdk':{getAdsSdk:()=>sdk},'./userActivity':{hasUserInteracted:()=>interacted,isGoalSurfaceActive:()=>false},'./adConfig':{adsEnabled:true,appOpenUnitId:'test',APP_OPEN_COLD_START_MAX_WAIT_MS:3000,APP_OPEN_MAX_CACHE_MS:14400000,APP_OPEN_MIN_INTERVAL_MS:900000,APP_OPEN_RESUME_MIN_BACKGROUND_MS:60000}};
  const exported={};
  vm.runInNewContext(source,{exports:exported,require:name=>{assert.ok(name in mocks,name);return mocks[name];},Date:{now:()=>now},console:{log(){},warn(){}},setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,at:now+delay});return timerId;},clearTimeout:id=>timers.delete(id)});
  const effects=()=>{const pending=queued;queued=[];pending.forEach(fn=>fn());};
  return {ads,adState,effects,appState(next){appStateListener(next)},render(ready=false,runEffects=true,protectedScreen=false){cursor=0;const result=exported.useAppOpenAd({gateColdStart:true,contentReady:ready,protectCounting:protectedScreen});if(runEffects)effects();return result;},advance(ms){now+=ms;},interact(){interacted=true;}};
}
async function prepare(h) {h.render();await new Promise(resolve=>setImmediate(resolve));h.render();assert.equal(h.ads.length,1);}
async function main() {
  const early=harness();await prepare(early);early.ads[0].loadedEvent();assert.equal(early.ads[0].shows,1,'ad during genuine loading may show');
  const ready=harness();await prepare(ready);ready.render(true,false);ready.ads[0].loadedEvent();assert.equal(ready.ads[0].shows,0,'ready content wins even before effects commit');ready.effects();assert.equal(ready.render(true).coldStartSettled,true);
  const late=harness();await prepare(late);late.advance(3001);late.ads[0].loadedEvent();assert.equal(late.ads[0].shows,0,'deadline blocks late SDK callback even when timer is delayed');
  const active=harness();await prepare(active);active.interact();active.ads[0].loadedEvent();assert.equal(active.ads[0].shows,0,'user interaction closes cold-start opportunity');
  const counting=harness();await prepare(counting);counting.render(true,true,true);counting.render(true,true,true);counting.ads.at(-1).loadedEvent();counting.appState("background");counting.advance(900001);counting.appState("active");assert.equal(counting.render(true,true,true).resumeGateVisible,false);
  const denied=harness();denied.adState.canRequestAds=false;denied.render();await new Promise(resolve=>setImmediate(resolve));denied.render();assert.equal(denied.ads.length,0,'no request without consent');
  console.log('  ok   actual App Open hook: loading opportunity, ready-content race, deadline, interaction and consent');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
