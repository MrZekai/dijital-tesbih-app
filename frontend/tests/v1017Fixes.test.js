// tests/v1017Fixes.test.js
//
// v1.0.17 düzeltmeleri için saf (RN gerektirmeyen) regresyon testleri.
// Çalıştırma:  node tests/v1017Fixes.test.js
//
// Kapsam:
//   1) Tesbihat aşama geçişi — güncelleyici içindeki yan etkiler kaldırıldı;
//      tek dokunuş TEK aşama ilerletir, 3x33 = 99 dokunuşta tamamlanır.
//   2) Büyük Yazı Modu ölçekleme — fontSize/lineHeight doğru büyüyor,
//      kapalıyken stil hiç değişmiyor.
//   3) App Open bekleme (cooldown) politikası — soğuk açılışta bekleme
//      uygulanmaz, sonraki gösterimlerde 4 dk uygulanır.

"use strict";

let failures = 0;
function assertEq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok  ${label} → ${a}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label} → beklenen ${e}, gelen ${a}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 1) TESBİHAT AŞAMA MANTIĞI
// app/tesbihat.tsx içindeki `onTap` ile birebir aynı saf mantık.
// ─────────────────────────────────────────────────────────────────────────
const STEP_COUNT = 3;
const STEP_TARGET = 33;

// NOT: Gercek kod artik ref tabanli (bkz. tests/qaNew001Attribution.test.js
// — QA NEW-001 yaris kosulu duzeltmesi). Burada da ayni sira izlenir.
function tap(stateIn) {
  const st = { ...stateIn };
  if (st.done) return st;

  const idx = st.stepIdx;
  const next = st.count + 1;
  const reachedTarget = next >= STEP_TARGET;
  const isLastStep = idx >= STEP_COUNT - 1;

  st.increments += 1; // incrementDhikrById(STEPS[idx].id)

  if (reachedTarget && !isLastStep) {
    st.stepIdx = idx + 1;
    st.count = 0;
  } else {
    st.count = next;
    if (reachedTarget && isLastStep) st.done = true;
  }

  if (reachedTarget) st.successHaptics += 1;
  return st;
}

function fresh() {
  return { stepIdx: 0, count: 0, done: false, increments: 0, successHaptics: 0 };
}

console.log("\n== Tesbihat: 33. dokunuşta TEK aşama ilerler ==");
{
  let s = fresh();
  for (let i = 0; i < 33; i++) s = tap(s);
  assertEq("33 dokunuş sonrası aşama", s.stepIdx, 1);
  assertEq("33 dokunuş sonrası sayaç", s.count, 0);
  assertEq("tamamlandı mı", s.done, false);
}

console.log("\n== Tesbihat: 99 dokunuşta tamamlanır ==");
{
  let s = fresh();
  for (let i = 0; i < 99; i++) s = tap(s);
  assertEq("son aşama", s.stepIdx, 2);
  assertEq("son sayaç", s.count, 33);
  assertEq("tamamlandı", s.done, true);
  assertEq("istatistiğe işlenen sayım", s.increments, 99);
  assertEq("hedef titreşimi (aşama başı 1)", s.successHaptics, 3);
}

console.log("\n== Tesbihat: tamamlandıktan sonra dokunuş sayılmaz ==");
{
  let s = fresh();
  for (let i = 0; i < 110; i++) s = tap(s);
  assertEq("toplam sayım 99'da kalır", s.increments, 99);
}

// ─────────────────────────────────────────────────────────────────────────
// 2) BÜYÜK YAZI MODU ÖLÇEKLEME
// src/components/AppText.tsx içindeki `scaleTextStyle` ile aynı mantık.
// ─────────────────────────────────────────────────────────────────────────
const BIG_TEXT_SCALE = 1.22;
const RN_DEFAULT_FONT_SIZE = 14;

function scaleTextStyle(flat, scale) {
  if (scale === 1) return flat; // referans aynen korunur (sıfır maliyet)
  const baseSize = (flat && flat.fontSize) || RN_DEFAULT_FONT_SIZE;
  const patch = { fontSize: Math.round(baseSize * scale) };
  if (flat && typeof flat.lineHeight === "number") {
    patch.lineHeight = Math.round(flat.lineHeight * scale);
  }
  return { ...flat, ...patch };
}

console.log("\n== Büyük Yazı Modu ==");
{
  const base = { fontSize: 15, color: "#fff" };
  assertEq("kapalıyken stil değişmez", scaleTextStyle(base, 1), base);
  assertEq("açıkken 15 → 18", scaleTextStyle(base, BIG_TEXT_SCALE).fontSize, 18);
  assertEq(
    "fontSize yoksa RN varsayılanı (14) baz alınır",
    scaleTextStyle({ color: "#fff" }, BIG_TEXT_SCALE).fontSize,
    17
  );
  assertEq(
    "lineHeight de ölçeklenir",
    scaleTextStyle({ fontSize: 16, lineHeight: 24 }, BIG_TEXT_SCALE).lineHeight,
    29
  );
  assertEq(
    "diğer stil alanları korunur",
    scaleTextStyle(base, BIG_TEXT_SCALE).color,
    "#fff"
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3) APP OPEN BEKLEME POLİTİKASI
// src/ads/useAppOpenAd.ts içindeki foreground kontrolüyle aynı mantık.
// ─────────────────────────────────────────────────────────────────────────
const APP_OPEN_COOLDOWN_MS = 4 * 60 * 1000;

function mayShow(lastShown, now) {
  if (lastShown === 0) return true; // hiç gösterilmedi → soğuk açılış
  return now - lastShown >= APP_OPEN_COOLDOWN_MS;
}

console.log("\n== App Open bekleme süresi ==");
{
  assertEq("soğuk açılışta gösterilir", mayShow(0, 1000), true);
  assertEq("1 dk sonra gösterilmez", mayShow(1_000_000, 1_060_000), false);
  assertEq("4 dk sonra gösterilir", mayShow(1_000_000, 1_240_000), true);
}

// ─────────────────────────────────────────────────────────────────────────
// 4) UX-2 — TUR (LAP) TAKIBI
// app/(tabs)/index.tsx icindeki hesapla ayni.
// ─────────────────────────────────────────────────────────────────────────
function lapInfo(count, target) {
  const t = Math.max(1, target);
  const laps = Math.floor(count / t);
  const inLap = count % t;
  const progress = count > 0 && inLap === 0 ? 1 : inLap / t;
  return { laps, inLap, progress };
}

console.log("\n== UX-2: tur takibi ==");
{
  assertEq("0/33 → tur 0, halka bos", lapInfo(0, 33), {
    laps: 0,
    inLap: 0,
    progress: 0,
  });
  assertEq("17/33 → tur 0, halka yarim", lapInfo(17, 33).laps, 0);
  assertEq("33/33 → tur 1, halka DOLU (0 degil)", lapInfo(33, 33), {
    laps: 1,
    inLap: 0,
    progress: 1,
  });
  assertEq("34/33 → tur 1, halka yeniden basladi", lapInfo(34, 33), {
    laps: 1,
    inLap: 1,
    progress: 1 / 33,
  });
  assertEq("50/33 → tur 1", lapInfo(50, 33).laps, 1);
  assertEq("66/33 → tur 2, halka DOLU", lapInfo(66, 33), {
    laps: 2,
    inLap: 0,
    progress: 1,
  });
  assertEq("hedef 1 iken bolme hatasi yok", lapInfo(5, 0).laps, 5);
}

// ─────────────────────────────────────────────────────────────────────────
// 5) UX-3 — TESBIHAT KALDIGI YERDEN DEVAM
// app/tesbihat.tsx icindeki `resumable` kosuluyla ayni.
// ─────────────────────────────────────────────────────────────────────────
const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const TARGETS = [33, 33, 33];

function isResumable(saved, now) {
  return (
    !!saved &&
    saved.stepIdx >= 0 &&
    saved.stepIdx < TARGETS.length &&
    saved.count > 0 &&
    saved.count < TARGETS[saved.stepIdx] &&
    now - saved.updatedAt < RESUME_MAX_AGE_MS
  );
}

console.log("\n== UX-3: tesbihat devam kurallari ==");
{
  const NOW = 1_000_000_000;
  assertEq("kayit yoksa devam yok", isResumable(null, NOW), false);
  assertEq(
    "yarim kalmis 2. asama 12 → devam",
    isResumable({ stepIdx: 1, count: 12, updatedAt: NOW - 60_000 }, NOW),
    true
  );
  assertEq(
    "sayac 0 ise devam etmeye gerek yok",
    isResumable({ stepIdx: 0, count: 0, updatedAt: NOW }, NOW),
    false
  );
  assertEq(
    "13 saat oncesi cok eski → bastan basla",
    isResumable({ stepIdx: 1, count: 12, updatedAt: NOW - 13 * 3600_000 }, NOW),
    false
  );
  assertEq(
    "bozuk asama indeksi reddedilir",
    isResumable({ stepIdx: 7, count: 5, updatedAt: NOW }, NOW),
    false
  );
  assertEq(
    "hedefe esit sayac reddedilir (asama zaten gecmis olmali)",
    isResumable({ stepIdx: 0, count: 33, updatedAt: NOW }, NOW),
    false
  );
}

console.log("\n----------------------------------");
if (failures > 0) {
  console.log(`${failures} TEST BAŞARISIZ`);
  process.exit(1);
}
console.log("TÜM v1.0.17 TESTLERİ GEÇTİ");
