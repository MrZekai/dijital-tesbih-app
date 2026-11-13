// Kalıcı veri şeması ve GERİYE DÖNÜK UYUMLU migration.
//
// ═══════════════════════════════════════════════════════════════════════
// NEDEN `version` HÂLÂ 1?
// ───────────────────────
// Play'de yayında olan 1.0.21 (versionCode 1028) yükleme kodu şu kontrolü
// yapıyor:
//
//     if (parsed && parsed.version === 1) { ...verileri kullan... }
//
// Yani `version` alanını 2'ye çıkarsaydık ve kullanıcı herhangi bir
// nedenle eski sürüme dönseydi (sideload, internal app sharing, cihaz
// yedeğinden geri yükleme), 1028 kaydı TANIMAZ ve kullanıcının TÜM
// sayaçları sıfırlanmış görünürdü.
//
// Bu yüzden diske yazılan `version` alanı KALICI OLARAK 1'dir. Kendi
// şema değişikliklerimizi AYRI bir alanda izleriz: `schemaRevision`.
// Eski sürüm bu alanı tanımaz, ama nesneyi olduğu gibi kopyaladığı
// (`{...parsed}`) için siler de. Sonuç: ileri VE geri uyumluluk.
//
// Geçerli kullanıcı kayıtları ve bilinmeyen alanlar korunur. Eksik alanlar
// doldurulur; geçersiz/negatif sayılar güvenli varsayılanlara dönüştürülür.
// ═══════════════════════════════════════════════════════════════════════

import { BUILTIN_DHIKRS } from "./dhikrs";
import type { CustomDhikr } from "./dhikrs";
import type { ThemePreference } from "./theme";

/** Diske yazılan uyumluluk işareti — ASLA değiştirme (yukarıdaki nota bak). */
export const LEGACY_VERSION = 1 as const;

/** Kendi şema düzeltmelerimizin sürümü. Yeni migration eklerken artır. */
export const SCHEMA_REVISION = 2;

/** Kalıcı veri anahtarı — 1.0.x'ten beri aynı, ASLA yeniden adlandırma. */
export const STORAGE_KEY = "zikirhane:v1";

export interface DhikrState {
  count: number;
  target: number;
  lastUsedAt: number | null;
}

export interface DailyLogEntry {
  /** YYYY-MM-DD */
  date: string;
  total: number;
  perDhikr: Record<string, number>;
}

export interface Settings {
  theme: ThemePreference;
  /**
   * ESKİ alan — 1.0.x ve 1028 bunu okur. `soundTap` ile AYNI tutulur ki
   * kullanıcı eski sürüme dönerse davranış birebir korunsun.
   */
  sound: boolean;
  /** Her dokunuşta tesbih tanesi sesi. Varsayılan KAPALI. */
  soundTap: boolean;
  /** Hedefe ulaşınca kısa tamamlanma sesi. Varsayılan AÇIK. */
  soundComplete: boolean;
  vibration: boolean;
  keepAwake: boolean;
  bigText: boolean;
  simpleMode: boolean;
  dailyGoal: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  onboardingDone: boolean;
  /** Sayaç sıfırlanırken onay iste (yanlış sıfırlamaya karşı). */
  confirmReset: boolean;
}

export interface TesbihatProgress {
  stepIdx: number;
  count: number;
  updatedAt: number;
}

export interface PersistedState {
  /** Eski sürümlerin tanıması için sabit 1. */
  version: 1;
  /** Bizim migration izleyicimiz (eski kayıtlarda yoktur). */
  schemaRevision?: number;
  activeDhikrId: string;
  customDhikrs: CustomDhikr[];
  dhikrStates: Record<string, DhikrState>;
  totalCount: number;
  dailyLog: Record<string, DailyLogEntry>;
  dhikrHistoryTotals: Record<string, number>;
  esmaCounters: Record<number, number>;
  esmaFavorites: number[];
  settings: Settings;
  tesbihatProgress: TesbihatProgress | null;
  lastActionAt: number | null;
  /** v1.1.0: favori zikir kimlikleri. */
  favoriteDhikrIds: string[];
  /** v1.1.0: en son kullanılan zikirler (en yeni başta, en çok 8 kayıt). */
  recentDhikrIds: string[];
}

export const RECENT_LIMIT = 8;

export const defaultSettings: Settings = {
  theme: "dark",
  sound: false,
  soundTap: false,
  soundComplete: true,
  vibration: true,
  keepAwake: false,
  bigText: false,
  simpleMode: false,
  dailyGoal: 100,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  onboardingDone: false,
  confirmReset: true,
};

export function defaultState(): PersistedState {
  const dhikrStates: Record<string, DhikrState> = {};
  for (const d of BUILTIN_DHIKRS) {
    dhikrStates[d.id] = { count: 0, target: d.defaultTarget, lastUsedAt: null };
  }
  return {
    version: LEGACY_VERSION,
    schemaRevision: SCHEMA_REVISION,
    activeDhikrId: "subhanallah",
    customDhikrs: [],
    dhikrStates,
    totalCount: 0,
    dailyLog: {},
    dhikrHistoryTotals: {},
    esmaCounters: {},
    esmaFavorites: [],
    settings: { ...defaultSettings },
    tesbihatProgress: null,
    lastActionAt: null,
    favoriteDhikrIds: [],
    recentDhikrIds: [],
  };
}

const VALID_THEMES: ThemePreference[] = ["dark", "light", "system"];

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asRecord<V>(v: unknown): Record<string, V> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, V>)
    : {};
}

/** Preserve recoverable numeric strings, reject negative/non-finite/unsafe values. */
function safeCount(value: unknown, fallback = 0): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}
function safeId(id: string): boolean {
  return id !== "__proto__" && id !== "constructor" && id !== "prototype";
}
function countRecord(value: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(asRecord<unknown>(value))
    .filter(([id]) => safeId(id)).map(([id, n]) => [id, safeCount(n)]));
}

/**
 * v1.0.16 mantığı (BUG-004) — kümülatif geçmiş alanı yoksa mevcut EN
 * GÜVENİLİR veriden yeniden inşa edilir. İki kaynağın MAKSİMUMU alınır,
 * toplamı DEĞİL; böylece çift sayım oluşmaz ve geçmiş asla azalmaz.
 */
export function seedHistoryTotals(
  dhikrStates: Record<string, DhikrState>,
  dailyLog: Record<string, DailyLogEntry>
): Record<string, number> {
  const historyFromDaily: Record<string, number> = {};
  for (const entry of Object.values(dailyLog || {})) {
    for (const [id, c] of Object.entries(entry?.perDhikr || {})) {
      historyFromDaily[id] = (historyFromDaily[id] || 0) + (c || 0);
    }
  }
  const seeded: Record<string, number> = {};
  const ids = new Set<string>([
    ...Object.keys(dhikrStates || {}),
    ...Object.keys(historyFromDaily),
  ]);
  for (const id of ids) {
    const live = dhikrStates?.[id]?.count || 0;
    const hist = historyFromDaily[id] || 0;
    seeded[id] = Math.max(live, hist);
  }
  return seeded;
}

/**
 * Diskten okunan ham nesneyi güvenli, tam bir `PersistedState`e çevirir.
 *
 * - Tanınmayan/bozuk girdi → `null` (çağıran taraf varsayılana düşer).
 * - Bilinmeyen ek alanlar KORUNUR (ileri uyumluluk).
 * - Hiçbir sayaç, hedef veya geçmiş değeri azaltılmaz.
 */
export function migrateState(raw: unknown): PersistedState | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;

  // 1028 ve öncesi yalnızca `version: 1` yazdı; ileride bir gün 2 yazan bir
  // sürüm çıkarsa onu da kabul et (veri kaybetmemek için tolere ediyoruz).
  const v = src.version;
  if (v !== 1 && v !== 2) return null;

  const base = defaultState();
  const dhikrStates: Record<string, DhikrState> = {
    ...base.dhikrStates,
    ...asRecord<DhikrState>(src.dhikrStates),
  };

  const customDhikrs = asArray<CustomDhikr>(src.customDhikrs)
    .filter((c) => c && typeof c.id === "string" && safeId(c.id) && typeof c.name === "string")
    .map((c) => ({ ...c, defaultTarget: Math.max(1, safeCount(c.defaultTarget, 33)),
      arabic: typeof c.arabic === "string" ? c.arabic : undefined }));
  for (const [id, value] of Object.entries(dhikrStates)) {
    if (!safeId(id)) { delete dhikrStates[id]; continue; }
    const cur = asRecord<unknown>(value);
    const fallback = BUILTIN_DHIKRS.find((d) => d.id === id)?.defaultTarget ?? 33;
    dhikrStates[id] = { count: safeCount(cur.count), target: Math.max(1, safeCount(cur.target, fallback)),
      lastUsedAt: cur.lastUsedAt == null ? null : safeCount(cur.lastUsedAt) };
  }
  for (const c of customDhikrs) {
    dhikrStates[c.id] ??= { count: 0, target: c.defaultTarget, lastUsedAt: null };
  }
  const dailyLog: Record<string, DailyLogEntry> = {};
  for (const [day, value] of Object.entries(asRecord<unknown>(src.dailyLog))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day))) continue;
    const entry = asRecord<unknown>(value);
    dailyLog[day] = { date: day, total: safeCount(entry.total), perDhikr: countRecord(entry.perDhikr) };
  }
  const rawSettings = asRecord<unknown>(src.settings);
  const themeRaw = rawSettings.theme as ThemePreference | undefined;

  const settings: Settings = {
    ...defaultSettings,
    ...(rawSettings as Partial<Settings>),
    theme:
      themeRaw && VALID_THEMES.includes(themeRaw) ? themeRaw : defaultSettings.theme,
  };
  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    if (typeof defaultSettings[key] === "boolean" && typeof rawSettings[key] !== "boolean") {
      (settings as unknown as Record<string, unknown>)[key] = defaultSettings[key];
    }
  }
  settings.dailyGoal = Math.max(1, safeCount(rawSettings.dailyGoal, defaultSettings.dailyGoal));
  settings.reminderHour = Math.min(23, safeCount(rawSettings.reminderHour, defaultSettings.reminderHour));
  settings.reminderMinute = Math.min(59, safeCount(rawSettings.reminderMinute, defaultSettings.reminderMinute));
  // `confirmReset` eski kayıtlarda yok → varsayılan olarak AÇIK gelir
  // (yanlış sıfırlamaya karşı koruma).
  if (typeof (rawSettings as Partial<Settings>).confirmReset !== "boolean") {
    settings.confirmReset = true;
  }

  // ── Ses ayarının ikiye bölünmesi (v1.1.0) ────────────────────────────
  // 1.0.x'te TEK bir `sound` anahtarı vardı ve varsayılanı KAPALI'ydı;
  // bu yüzden hedefe ulaşıldığında da hiç ses çıkmıyordu (kullanıcı
  // geri bildirimi). Artık iki ayrı ayar var:
  //
  //   soundTap      → her dokunuşta tane sesi   (eski davranış, kapalı)
  //   soundComplete → hedefe ulaşınca tek ses   (yeni, AÇIK)
  //
  // Geriye dönük eşleme:
  //   eski sound = true  → soundTap = true,  soundComplete = true
  //   eski sound = false → soundTap = false, soundComplete = true
  // `sound` alanı `soundTap` ile senkron tutulur; eski sürüme dönülürse
  // kullanıcının tanıdığı davranış aynen geçerli olur.
  const legacySound = (rawSettings as Partial<Settings>).sound === true;
  if (typeof (rawSettings as Partial<Settings>).soundTap !== "boolean") {
    settings.soundTap = legacySound;
  }
  if (typeof (rawSettings as Partial<Settings>).soundComplete !== "boolean") {
    settings.soundComplete = true;
  }
  settings.sound = settings.soundTap;

  const existingHistory = countRecord(src.dhikrHistoryTotals);
  const dhikrHistoryTotals =
    Object.keys(existingHistory).length > 0
      ? existingHistory
      : seedHistoryTotals(dhikrStates, dailyLog);

  const knownIds = new Set<string>([
    ...Object.keys(dhikrStates),
    ...customDhikrs.map((c) => c.id),
  ]);

  const favoriteDhikrIds = Array.from(
    new Set(asArray<string>(src.favoriteDhikrIds).filter((id) => knownIds.has(id)))
  );

  // Eski kayıtlarda "son kullanılanlar" yoktu → `lastUsedAt` alanından
  // yeniden inşa edilir. Bu, kullanıcının ilk açılışta boş liste yerine
  // anlamlı bir geçmiş görmesini sağlar.
  const recentFromRaw = asArray<string>(src.recentDhikrIds).filter((id) =>
    knownIds.has(id)
  );
  const recentDhikrIds =
    recentFromRaw.length > 0
      ? Array.from(new Set(recentFromRaw)).slice(0, RECENT_LIMIT)
      : Object.entries(dhikrStates)
          .filter(([, s]) => typeof s?.lastUsedAt === "number" && s.lastUsedAt)
          .sort((a, b) => (b[1].lastUsedAt || 0) - (a[1].lastUsedAt || 0))
          .slice(0, RECENT_LIMIT)
          .map(([id]) => id);

  const activeCandidate =
    typeof src.activeDhikrId === "string" && knownIds.has(src.activeDhikrId)
      ? src.activeDhikrId
      : base.activeDhikrId;

  const progress = asRecord<unknown>(src.tesbihatProgress);
  const validProgress = Number.isInteger(progress.stepIdx) && Number(progress.stepIdx) >= 0 && Number(progress.stepIdx) < 3 &&
    Number.isInteger(progress.count) && Number(progress.count) >= 0 && Number(progress.count) < 33 &&
    typeof progress.updatedAt === "number" && Number.isFinite(progress.updatedAt) && progress.updatedAt > 0;
  const migrated: PersistedState = {
    // Bilinmeyen ek alanları koru (ileri uyumluluk).
    ...(src as object),
    version: LEGACY_VERSION,
    schemaRevision: SCHEMA_REVISION,
    activeDhikrId: activeCandidate,
    customDhikrs,
    dhikrStates,
    totalCount: safeCount(src.totalCount),
    dailyLog,
    dhikrHistoryTotals,
    esmaCounters: countRecord(src.esmaCounters) as Record<number, number>,
    esmaFavorites: [...new Set(asArray<number>(src.esmaFavorites).filter((n) => Number.isInteger(n) && n >= 1 && n <= 99))],
    settings,
    tesbihatProgress:
      validProgress
        ? (src.tesbihatProgress as TesbihatProgress)
        : null,
    lastActionAt:
      src.lastActionAt == null ? null : safeCount(src.lastActionAt),
    favoriteDhikrIds,
    recentDhikrIds,
  };

  return migrated;
}

// ── Türetilmiş istatistikler ───────────────────────────────────────────

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * Seri (streak) hesabı — AYRI bir kalıcı alan tutmayız; doğrudan
 * `dailyLog`dan türetilir. Böylece saat/zaman dilimi değişimlerinde
 * bozulacak ikinci bir doğruluk kaynağı oluşmaz.
 *
 * - "Güncel seri": bugünden (veya dün sayım varsa dünden) geriye doğru
 *   kesintisiz sayım yapılan gün sayısı. Bugün henüz sayım yoksa seri
 *   KIRILMIŞ sayılmaz — kullanıcının günü henüz bitmemiştir.
 * - "En uzun seri": tüm geçmişteki en uzun kesintisiz blok.
 */
export function computeStreak(
  dailyLog: Record<string, DailyLogEntry>,
  today: Date = new Date()
): StreakInfo {
  const days = Object.keys(dailyLog || {})
    .filter((k) => (dailyLog[k]?.total || 0) > 0)
    .sort();
  if (days.length === 0) return { current: 0, best: 0 };

  const set = new Set(days);

  // En uzun seri
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of days) {
    const d = new Date(`${key}T00:00:00`);
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }

  // Güncel seri
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!set.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dateKey(cursor))) return { current: 0, best };
  }
  let current = 0;
  while (set.has(dateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { current, best };
}

/** Yedekleme dosyasının içeriği. */
export interface BackupPayload {
  app: "com.zikirhane.tesbih";
  kind: "zikirmatik-backup";
  backupVersion: 1;
  exportedAt: string;
  appVersion: string;
  state: PersistedState;
}

export function buildBackup(
  state: PersistedState,
  appVersion: string
): BackupPayload {
  return {
    app: "com.zikirhane.tesbih",
    kind: "zikirmatik-backup",
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    state,
  };
}
