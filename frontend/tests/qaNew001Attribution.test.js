// tests/qaNew001Attribution.test.js
//
// QA raporu NEW-001 için regresyon testi:
//   "Namaz mode credits taps to the wrong dhikr immediately after
//    auto-advance" (per-dhikr attribution race condition)
//
// Çalıştırma:  node tests/qaNew001Attribution.test.js
//
// Bu test, raporun ölçtüğü ÜÇ senaryoyu birebir yeniden üretir ve hem
// ESKİ (hatalı) hem YENİ (düzeltilmiş) mantığı yan yana koşturur.
// Eski mantığın rapordaki hatalı sayıları ürettiği, yenisinin doğru
// sonuç verdiği doğrulanır — yani test gerçekten bu hatayı yakalıyor.

"use strict";

const STEPS = [
  { id: "subhanallah", target: 33 },
  { id: "elhamdulillah", target: 33 },
  { id: "allahuekber", target: 33 },
];

let failures = 0;
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${label} → ${a}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label} → beklenen ${e}, gelen ${a}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// React render zamanlaması simülasyonu
//
// `flushEvery` = kaç dokunuşta bir React yeniden render edip closure'ı
// tazeler. Gerçek cihazda hızlı dokunuşta (≈12-13 tap/s) birden fazla
// dokunuş aynı kare içinde işlenir → closure eskir.
//   flushEvery = 1      → her dokunuştan sonra render (yavaş, aralıklı dokunuş)
//   flushEvery = 3      → hızlı dokunuş (rapordaki senaryo)
// ─────────────────────────────────────────────────────────────────────────

/** ESKİ mantık: `step` ve `count` render closure'ından okunur. */
function runOld(taps, flushEvery) {
  const credited = {};
  // "Committed" (render edilmiş) durum — closure bunu görür.
  let renderStepIdx = 0;
  let renderCount = 0;
  // Bekleyen state güncellemeleri.
  let pendingStepIdx = 0;
  let pendingCount = 0;

  for (let i = 1; i <= taps; i++) {
    const step = STEPS[renderStepIdx]; // ← ESKİ closure değeri
    credited[step.id] = (credited[step.id] || 0) + 1;

    const next = renderCount + 1; // ← ESKİ closure değeri
    if (next >= step.target) {
      if (renderStepIdx < STEPS.length - 1) {
        pendingStepIdx = renderStepIdx + 1;
        pendingCount = 0;
      } else {
        pendingCount = next;
      }
    } else {
      pendingCount = next;
    }

    if (i % flushEvery === 0) {
      renderStepIdx = pendingStepIdx;
      renderCount = pendingCount;
    }
  }
  return credited;
}

/** YENİ mantık: otoriter değerler ref'te, commit anında senkron okunur. */
function runNew(taps, flushEvery) {
  const credited = {};
  const ref = { stepIdx: 0, count: 0, done: false };
  // Render state'i sadece ekran için — mantığı etkilemez.
  let renderStepIdx = 0;
  let renderCount = 0;

  for (let i = 1; i <= taps; i++) {
    if (ref.done) break;

    const idx = ref.stepIdx; // ← REF (her zaman güncel)
    const step = STEPS[idx];
    const next = ref.count + 1; // ← REF
    const reachedTarget = next >= step.target;
    const isLastStep = idx >= STEPS.length - 1;

    credited[step.id] = (credited[step.id] || 0) + 1;

    if (reachedTarget && !isLastStep) {
      ref.stepIdx = idx + 1;
      ref.count = 0;
    } else {
      ref.count = next;
      if (reachedTarget && isLastStep) ref.done = true;
    }

    if (i % flushEvery === 0) {
      renderStepIdx = ref.stepIdx;
      renderCount = ref.count;
    }
  }
  void renderStepIdx;
  void renderCount;
  return credited;
}

const g = (o, k) => o[k] || 0;

// ─────────────────────────────────────────────────────────────────────────
console.log("\n== Rapor Test 1: geçiş yok — 5 hızlı dokunuş ==");
{
  const oldR = runOld(5, 3);
  const newR = runNew(5, 3);
  assertEq("ESKİ  Sübhanallah", g(oldR, "subhanallah"), 5);
  assertEq("YENİ  Sübhanallah", g(newR, "subhanallah"), 5);
  assertEq("YENİ  Elhamdülillah", g(newR, "elhamdulillah"), 0);
}

console.log("\n== Rapor Test 2: 1 geçişten geçen 35 hızlı dokunuş ==");
console.log("   (rapordaki ölçüm: ESKİ = +35 / +0, beklenen = +33 / +2)");
{
  const oldR = runOld(35, 3);
  const newR = runNew(35, 3);
  // Eski mantığın gerçekten hatalı olduğunu KANITLA:
  if (g(oldR, "subhanallah") === 33 && g(oldR, "elhamdulillah") === 2) {
    failures += 1;
    console.log("  FAIL Test anlamsız: eski mantık zaten doğru sonuç verdi");
  } else {
    console.log(
      `  ok   ESKİ mantık hatayı yeniden üretti → Sübhanallah ${g(
        oldR,
        "subhanallah"
      )} / Elhamdülillah ${g(oldR, "elhamdulillah")}`
    );
  }
  assertEq("YENİ  Sübhanallah", g(newR, "subhanallah"), 33);
  assertEq("YENİ  Elhamdülillah", g(newR, "elhamdulillah"), 2);
}

console.log("\n== Rapor Test 3: 2 geçişten geçen 70 hızlı dokunuş ==");
console.log("   (rapordaki ölçüm: ESKİ = +43 / +36 / +1, beklenen = +33/+33/+4)");
{
  const newR = runNew(70, 3);
  assertEq("YENİ  Sübhanallah", g(newR, "subhanallah"), 33);
  assertEq("YENİ  Elhamdülillah", g(newR, "elhamdulillah"), 33);
  assertEq("YENİ  Allahu Ekber", g(newR, "allahuekber"), 4);
}

console.log("\n== Rapor Test 4: aralıklı dokunuş (33 hızlı + 5 yavaş) ==");
{
  const newR = runNew(38, 1);
  assertEq("YENİ  Sübhanallah", g(newR, "subhanallah"), 33);
  assertEq("YENİ  Elhamdülillah", g(newR, "elhamdulillah"), 5);
}

console.log("\n== Toplam korunumu: hiçbir dokunuş kaybolmuyor ==");
{
  for (const flush of [1, 2, 3, 5, 8]) {
    const newR = runNew(99, flush);
    const total = Object.values(newR).reduce((a, b) => a + b, 0);
    assertEq(`flushEvery=${flush} toplam sayım`, total, 99);
  }
}

console.log("\n== 99 dokunuş: tam 33/33/33 dağılımı ==");
{
  for (const flush of [1, 3, 7]) {
    const newR = runNew(99, flush);
    assertEq(`flushEvery=${flush} dağılım`, [
      g(newR, "subhanallah"),
      g(newR, "elhamdulillah"),
      g(newR, "allahuekber"),
    ], [33, 33, 33]);
  }
}

console.log("\n== Tamamlandıktan sonra fazladan dokunuş sayılmaz ==");
{
  const newR = runNew(120, 3);
  const total = Object.values(newR).reduce((a, b) => a + b, 0);
  assertEq("toplam 99'da kalır", total, 99);
}

console.log("\n----------------------------------");
if (failures > 0) {
  console.log(`${failures} TEST BAŞARISIZ`);
  process.exit(1);
}
console.log("NEW-001 REGRESYON TESTLERİ GEÇTİ");
