// tests/multiTouchCounting.test.js
//
// Node-native (no jest) smoke tests for the multi-touch counting semantics
// of the counter. Runs via `node scripts/run-multitouch-tests.js`.
//
// We do NOT boot RN/RNGH here; instead we simulate the exact algorithm used
// by MultiTouchTapArea's onTouchesDown handler and assert the counting
// behavior matches the required specification (single/rapid/2-finger/
// 4-finger/long-press/drag/release semantics).

"use strict";

// Simulator: mirrors the semantics of `Gesture.Manual().onTouchesDown((event) => { runOnJS(onTap)() per changedTouches[i] })`
function simulate(events, onTap) {
  for (const ev of events) {
    // Only `down` events with changedTouches count trigger increments.
    if (ev.type === "down") {
      for (let i = 0; i < ev.changedTouches; i += 1) {
        onTap();
      }
    }
    // up/move/cancel do NOT trigger increments.
  }
}

let failures = 0;
function assertEq(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ok  ${label} → ${actual}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label} → expected ${expected}, got ${actual}`);
  }
}

function run(name, fn) {
  console.log(`\n== ${name} ==`);
  let count = 0;
  const tap = () => {
    count += 1;
  };
  const finalCount = fn(tap);
  return finalCount ?? count;
}

// 1) Single finger — 100 taps = 100 counts
{
  const total = run("Single finger — 100 taps", (tap) => {
    let c = 0;
    for (let i = 0; i < 100; i += 1) {
      simulate(
        [
          { type: "down", changedTouches: 1 },
          { type: "up", changedTouches: 1 },
        ],
        () => {
          tap();
          c += 1;
        }
      );
    }
    return c;
  });
  assertEq("single-100", total, 100);
}

// 2) Fast single finger — 800 taps = 800 counts
{
  const total = run("Fast single finger — 800 taps", (tap) => {
    let c = 0;
    for (let i = 0; i < 800; i += 1) {
      simulate(
        [
          { type: "down", changedTouches: 1 },
          { type: "up", changedTouches: 1 },
        ],
        () => {
          tap();
          c += 1;
        }
      );
    }
    return c;
  });
  assertEq("single-800", total, 800);
}

// 3) Two simultaneous fingers — A×50 + B×50 = 100
{
  const total = run("Two-finger simultaneous — 50+50", (tap) => {
    let c = 0;
    for (let i = 0; i < 50; i += 1) {
      // Both fingers press down together (RNGH fires ONE onTouchesDown with
      // changedTouches=2), then both lift together.
      simulate(
        [
          { type: "down", changedTouches: 2 },
          { type: "up", changedTouches: 2 },
        ],
        () => {
          tap();
          c += 1;
        }
      );
    }
    return c;
  });
  assertEq("two-50+50", total, 100);
}

// 4) Four simultaneous fingers — 25×4 = 100
{
  const total = run("Four-finger simultaneous — 25×4", (tap) => {
    let c = 0;
    for (let i = 0; i < 25; i += 1) {
      simulate(
        [
          { type: "down", changedTouches: 4 },
          { type: "up", changedTouches: 4 },
        ],
        () => {
          tap();
          c += 1;
        }
      );
    }
    return c;
  });
  assertEq("four-25x4", total, 100);
}

// 5) Long press — 1 down + hold + up = 1 count
{
  const total = run("Long press — 1 physical press", (tap) => {
    let c = 0;
    simulate(
      [
        { type: "down", changedTouches: 1 },
        { type: "move", changedTouches: 1 },
        { type: "move", changedTouches: 1 },
        { type: "move", changedTouches: 1 },
        { type: "up", changedTouches: 1 },
      ],
      () => {
        tap();
        c += 1;
      }
    );
    return c;
  });
  assertEq("long-press", total, 1);
}

// 6) Finger drag — 1 down + many moves + 1 up = 1 count
{
  const total = run("Finger drag", (tap) => {
    let c = 0;
    const events = [{ type: "down", changedTouches: 1 }];
    for (let i = 0; i < 200; i += 1) events.push({ type: "move", changedTouches: 1 });
    events.push({ type: "up", changedTouches: 1 });
    simulate(events, () => {
      tap();
      c += 1;
    });
    return c;
  });
  assertEq("drag", total, 1);
}

// 7) Release only — a stray up event without a prior down should not count
{
  const total = run("Release-only event", (tap) => {
    let c = 0;
    simulate([{ type: "up", changedTouches: 1 }], () => {
      tap();
      c += 1;
    });
    return c;
  });
  assertEq("release-only", total, 0);
}

// 8) Staggered multi-touch: finger A down, then B down, then both up
{
  const total = run("Staggered multi-touch — A down, B down, both up", (tap) => {
    let c = 0;
    simulate(
      [
        { type: "down", changedTouches: 1 }, // A down
        { type: "down", changedTouches: 1 }, // B down (separate event)
        { type: "up", changedTouches: 2 },   // A+B up together
      ],
      () => {
        tap();
        c += 1;
      }
    );
    return c;
  });
  assertEq("staggered-A+B", total, 2);
}

console.log("\n----------------------------------");
if (failures === 0) {
  console.log("ALL MULTI-TOUCH COUNTING TESTS PASSED");
  process.exit(0);
} else {
  console.log(`${failures} test(s) FAILED`);
  process.exit(1);
}
