// Zikirhane global store — React Context + AsyncStorage persistence.
// Tüm veriler cihaz içinde saklanır (offline).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { storage } from "@/src/utils/storage";

import { BUILTIN_DHIKRS, type AnyDhikr, type CustomDhikr } from "./dhikrs";
import { darkTheme, getTheme, lightTheme, type ThemeName, type ThemeTokens } from "./theme";

const KEY = "zikirhane:v1";

export interface DhikrState {
  count: number;
  target: number;
  lastUsedAt: number | null;
}

export interface DailyLogEntry {
  // key = YYYY-MM-DD
  date: string;
  total: number;
  perDhikr: Record<string, number>;
}

export interface Settings {
  theme: ThemeName;
  sound: boolean;
  vibration: boolean;
  keepAwake: boolean;
  bigText: boolean;
  simpleMode: boolean;
  dailyGoal: number;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  onboardingDone: boolean;
}

/**
 * QA UX-3: "Namaz Sonrası Tesbihat" ekranından çıkınca ilerleme tamamen
 * kayboluyordu (kullanıcı 60. zikirde telefonu bıraksa baştan başlıyordu).
 * İlerleme artık kalıcı olarak saklanır ve kaldığı yerden devam eder.
 */
export interface TesbihatProgress {
  stepIdx: number;
  count: number;
  updatedAt: number;
}

export interface PersistedState {
  version: 1;
  activeDhikrId: string;
  customDhikrs: CustomDhikr[];
  dhikrStates: Record<string, DhikrState>;
  totalCount: number;
  dailyLog: Record<string, DailyLogEntry>;
  // BUG-004 duzeltmesi: canli sayac (dhikrStates[id].count) "Sıfırla" ile
  // silinebilir; "En Sık Yapılan Zikirler" gibi kalici istatistikler bu
  // AYRI kumulatif alandan okunmali — Sıfırla bu alani ASLA etkilemez.
  dhikrHistoryTotals: Record<string, number>;
  esmaCounters: Record<number, number>;
  esmaFavorites: number[];
  settings: Settings;
  /** Yarim kalmis Namaz Sonrasi Tesbihat ilerlemesi (yoksa null). */
  tesbihatProgress: TesbihatProgress | null;
  lastActionAt: number | null;
}

const defaultSettings: Settings = {
  theme: "dark",
  sound: false,
  vibration: true,
  keepAwake: false,
  bigText: false,
  simpleMode: false,
  dailyGoal: 100,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  onboardingDone: false,
};

const defaultState = (): PersistedState => {
  const dhikrStates: Record<string, DhikrState> = {};
  for (const d of BUILTIN_DHIKRS) {
    dhikrStates[d.id] = {
      count: 0,
      target: d.defaultTarget,
      lastUsedAt: null,
    };
  }
  return {
    version: 1,
    activeDhikrId: "subhanallah",
    customDhikrs: [],
    dhikrStates,
    totalCount: 0,
    dailyLog: {},
    dhikrHistoryTotals: {},
    esmaCounters: {},
    esmaFavorites: [],
    settings: defaultSettings,
    tesbihatProgress: null,
    lastActionAt: null,
  };
};

const todayKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// BUG-002 + BUG-001 duzeltmesi icin PAYLASILAN saf artirma mantigi.
// Hem Ana Sayfa'daki `increment()` hem de Namaz Sonrası Tesbihat'taki
// `incrementDhikrById(id)` AYNI bu fonksiyonu kullanir — bu sayede:
//   - Tesbihat sayimlari da toplam/günlük/haftalık/aylık istatistiklere
//     ve "En Sık Yapılan Zikirler" kumulatif gecmisine dogru sekilde akar.
//   - Ayni sayac mantigi iki yerde ayri ayri yazilmadigi icin CIFT SAYIM
//     riski olmaz (her dokunus = tam olarak bir applyIncrement cagrisi).
function applyIncrement(
  prev: PersistedState,
  id: string
): { next: PersistedState; justReachedTarget: boolean; dateKey: string } {
  const cur = prev.dhikrStates[id] || {
    count: 0,
    target: 33,
    lastUsedAt: null,
  };
  const nextCount = cur.count + 1;
  const justReachedTarget = nextCount === cur.target;
  const now = Date.now();
  const dateKey = todayKey();
  const prevEntry: DailyLogEntry = prev.dailyLog[dateKey] || {
    date: dateKey,
    total: 0,
    perDhikr: {},
  };
  const newEntry: DailyLogEntry = {
    date: dateKey,
    total: prevEntry.total + 1,
    perDhikr: {
      ...prevEntry.perDhikr,
      [id]: (prevEntry.perDhikr[id] || 0) + 1,
    },
  };
  const next: PersistedState = {
    ...prev,
    dhikrStates: {
      ...prev.dhikrStates,
      [id]: { count: nextCount, target: cur.target, lastUsedAt: now },
    },
    totalCount: prev.totalCount + 1,
    dailyLog: { ...prev.dailyLog, [dateKey]: newEntry },
    dhikrHistoryTotals: {
      ...(prev.dhikrHistoryTotals || {}),
      [id]: ((prev.dhikrHistoryTotals || {})[id] || 0) + 1,
    },
    lastActionAt: now,
  };
  return { next, justReachedTarget, dateKey };
}

interface UndoEntry {
  dhikrId: string;
  dateKey: string;
  ts: number;
}

interface StoreValue {
  state: PersistedState;
  theme: ThemeTokens;
  loaded: boolean;
  allDhikrs: AnyDhikr[];
  activeDhikr: AnyDhikr;
  activeDhikrState: DhikrState;
  increment: () => { justReachedTarget: boolean };
  // BUG-002: Namaz Sonrası Tesbihat gibi ekranlarin, aktif zikirden
  // BAGIMSIZ olarak belirli bir zikir id'sini istatistiklere isleyebilmesi
  // icin genel amacli artirma fonksiyonu.
  incrementDhikrById: (id: string) => { justReachedTarget: boolean };
  undo: () => boolean;
  reset: () => void;
  setActiveDhikr: (id: string) => void;
  setTargetForActive: (target: number) => void;
  addCustomDhikr: (input: { name: string; arabic?: string; target: number }) => string;
  updateCustomDhikr: (
    id: string,
    input: { name?: string; arabic?: string; target?: number }
  ) => void;
  deleteCustomDhikr: (id: string) => void;
  incEsma: (no: number) => void;
  resetEsma: (no: number) => void;
  toggleEsmaFavorite: (no: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  // UX-3: yarim kalmis tesbihat ilerlemesi
  setTesbihatProgress: (p: { stepIdx: number; count: number }) => void;
  clearTesbihatProgress: () => void;
  finishOnboarding: () => void;
  resetAllStats: () => void;
  // stats helpers
  todayTotal: () => number;
  weeklyTotals: () => { date: string; total: number }[];
  monthlyTotal: () => number;
  topDhikrs: (limit?: number) => { id: string; name: string; count: number }[];
}

const StoreContext = createContext<StoreValue | null>(null);

const CONTAINER_KEY = "container";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const undoStack = useRef<UndoEntry[]>([]);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BUG-001 duzeltmesi: uzun/hizli surekli dokunus oturumlarinda debounce
  // yazma suresizce ertelenebiliyordu (her dokunus zamanlayiciyi sifirliyor)
  // — beklenmedik sonlanma/crash durumunda TUM oturum kaybolabiliyordu.
  // `maxWaitTimer` bunu en fazla ~1.5sn'de bir ZORLA diske yazarak sinirlar.
  const maxWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<PersistedState | null>(null);

  // Load persisted state on boot
  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem(KEY, null);
        if (raw && typeof raw === "string") {
          const parsed = JSON.parse(raw) as PersistedState;
          if (parsed && parsed.version === 1) {
            // Merge new builtin dhikrs if any missing
            const merged = { ...parsed };
            for (const d of BUILTIN_DHIKRS) {
              if (!merged.dhikrStates[d.id]) {
                merged.dhikrStates[d.id] = {
                  count: 0,
                  target: d.defaultTarget,
                  lastUsedAt: null,
                };
              }
            }
            merged.settings = { ...defaultSettings, ...parsed.settings };
            // BUG-004 geri-uyumlu migration (v1.0.15 → v1.0.16):
            // Yeni `dhikrHistoryTotals` alanı yoksa, KÜMÜLATİF geçmişi
            // mevcut EN GÜVENİLİR kalıcı veriden yeniden inşa ederiz. İki
            // kaynak vardır:
            //   1) dailyLog[*].perDhikr toplamı → tarihsel kümülatif sayım
            //   2) dhikrStates[id].count       → canlı sayaç (Sıfırla ile azalır)
            // Kullanıcının geçmişini ASLA azaltmamak için ikisinin
            // MAKSİMUMUNU alırız (TOPLAMA yapmayız → çift sayım olmaz):
            //   - canlı=40,  geçmiş=40   → 40   (Case A)
            //   - canlı=0,   geçmiş=2000 → 2000 (Case B)
            //   - canlı=150, geçmiş=100  → 150  (Case C, en yüksek güvenilir değer)
            // Migration YALNIZCA alan henüz yokken çalışır; varsa aynen
            // korunur (Case D). Mevcut günlük/haftalık/aylık istatistikler
            // (dailyLog/totalCount) hiç değiştirilmez.
            // UX-3 alani eski kayitlarda yok → null'a normalize et.
            if (merged.tesbihatProgress === undefined) {
              merged.tesbihatProgress = null;
            }
            if (!merged.dhikrHistoryTotals) {
              const historyFromDaily: Record<string, number> = {};
              for (const entry of Object.values(merged.dailyLog || {})) {
                for (const [id, c] of Object.entries(entry?.perDhikr || {})) {
                  historyFromDaily[id] = (historyFromDaily[id] || 0) + (c || 0);
                }
              }
              const seeded: Record<string, number> = {};
              const ids = new Set<string>([
                ...Object.keys(merged.dhikrStates || {}),
                ...Object.keys(historyFromDaily),
              ]);
              for (const id of ids) {
                const live = merged.dhikrStates[id]?.count || 0;
                const hist = historyFromDaily[id] || 0;
                seeded[id] = Math.max(live, hist);
              }
              merged.dhikrHistoryTotals = seeded;
            }
            setState(merged);
          }
        }
      } catch (e) {
        console.warn("[store] load failed", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Guvenli/sik persistans: debounce (200ms) + zorunlu maksimum bekleme
  // (1.5s) + arka plana gecerken aninda flush. Asiri senkron yazma yok —
  // sadece sinirli sikilikta yaziyoruz.
  useEffect(() => {
    if (!loaded) return;
    pendingStateRef.current = state;

    const flushNow = () => {
      const toSave = pendingStateRef.current;
      if (toSave) {
        storage.setItem(KEY, JSON.stringify(toSave));
      }
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      if (maxWaitTimer.current) {
        clearTimeout(maxWaitTimer.current);
        maxWaitTimer.current = null;
      }
    };

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(flushNow, 200);

    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(flushNow, 1500);
    }

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state, loaded]);

  // Uygulama arka plana/inaktif duruma gecerken bekleyen degisiklikleri
  // ANINDA diske yaz — arka plana alinma/oldurulme senaryolarinda veri
  // kaybini en aza indirir.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        if (pendingStateRef.current) {
          storage.setItem(KEY, JSON.stringify(pendingStateRef.current));
        }
      }
    });
    return () => sub.remove();
  }, []);

  const setStateSafe = useCallback(
    (updater: (prev: PersistedState) => PersistedState) => {
      setState(updater);
    },
    []
  );

  const allDhikrs: AnyDhikr[] = useMemo(
    () => [...BUILTIN_DHIKRS, ...state.customDhikrs],
    [state.customDhikrs]
  );

  const activeDhikr: AnyDhikr =
    allDhikrs.find((d) => d.id === state.activeDhikrId) || BUILTIN_DHIKRS[0];

  const activeDhikrState: DhikrState =
    state.dhikrStates[activeDhikr.id] || {
      count: 0,
      target: activeDhikr.defaultTarget,
      lastUsedAt: null,
    };

  const increment: StoreValue["increment"] = () => {
    let justReachedTarget = false;
    setStateSafe((prev) => {
      const id = prev.activeDhikrId;
      const { next, justReachedTarget: jr, dateKey } = applyIncrement(prev, id);
      justReachedTarget = jr;
      undoStack.current.push({ dhikrId: id, dateKey, ts: Date.now() });
      // Keep last 200 entries in undo stack
      if (undoStack.current.length > 200) undoStack.current.shift();
      return next;
    });
    return { justReachedTarget };
  };

  // BUG-002: Namaz Sonrası Tesbihat (ve ileride benzer akislar) icin — aktif
  // zikirden bagimsiz, belirtilen zikir id'sine dogrudan sayim ekler. AYNI
  // `applyIncrement` mantigini kullanir, bu yuzden toplam/günlük/haftalık/
  // aylık istatistikler ve "En Sık Yapılan Zikirler" dogru sekilde guncellenir.
  const incrementDhikrById: StoreValue["incrementDhikrById"] = (id) => {
    let justReachedTarget = false;
    setStateSafe((prev) => {
      const { next, justReachedTarget: jr, dateKey } = applyIncrement(prev, id);
      justReachedTarget = jr;
      undoStack.current.push({ dhikrId: id, dateKey, ts: Date.now() });
      if (undoStack.current.length > 200) undoStack.current.shift();
      return next;
    });
    return { justReachedTarget };
  };

  const undo: StoreValue["undo"] = () => {
    const entry = undoStack.current.pop();
    if (!entry) return false;
    setStateSafe((prev) => {
      const cur = prev.dhikrStates[entry.dhikrId];
      if (!cur || cur.count <= 0) return prev;
      const dailyEntry = prev.dailyLog[entry.dateKey];
      const nextDaily: Record<string, DailyLogEntry> = { ...prev.dailyLog };
      if (dailyEntry) {
        const perD = { ...dailyEntry.perDhikr };
        perD[entry.dhikrId] = Math.max(0, (perD[entry.dhikrId] || 0) - 1);
        nextDaily[entry.dateKey] = {
          ...dailyEntry,
          total: Math.max(0, dailyEntry.total - 1),
          perDhikr: perD,
        };
      }
      // BUG-004 tutarliligi: undo, eklenmis olan kumulatif gecmis sayimini
      // da geri alir (aksi halde undo sonrasi "hayalet" bir sayim kalirdi).
      const nextHistory: Record<string, number> = {
        ...(prev.dhikrHistoryTotals || {}),
      };
      nextHistory[entry.dhikrId] = Math.max(
        0,
        (nextHistory[entry.dhikrId] || 0) - 1
      );
      return {
        ...prev,
        dhikrStates: {
          ...prev.dhikrStates,
          [entry.dhikrId]: { ...cur, count: cur.count - 1 },
        },
        totalCount: Math.max(0, prev.totalCount - 1),
        dailyLog: nextDaily,
        dhikrHistoryTotals: nextHistory,
      };
    });
    return true;
  };

  const reset: StoreValue["reset"] = () => {
    setStateSafe((prev) => {
      const id = prev.activeDhikrId;
      const cur = prev.dhikrStates[id];
      if (!cur) return prev;
      return {
        ...prev,
        dhikrStates: {
          ...prev.dhikrStates,
          [id]: { ...cur, count: 0 },
        },
      };
    });
    // Clear undo stack for this dhikr's counts
    undoStack.current = [];
  };

  const setActiveDhikr: StoreValue["setActiveDhikr"] = (id) => {
    setStateSafe((prev) => ({ ...prev, activeDhikrId: id }));
  };

  const setTargetForActive: StoreValue["setTargetForActive"] = (target) => {
    setStateSafe((prev) => {
      const id = prev.activeDhikrId;
      const cur = prev.dhikrStates[id];
      if (!cur) return prev;
      return {
        ...prev,
        dhikrStates: {
          ...prev.dhikrStates,
          [id]: { ...cur, target: Math.max(1, target) },
        },
      };
    });
  };

  const addCustomDhikr: StoreValue["addCustomDhikr"] = ({ name, arabic, target }) => {
    const id = `custom-${Date.now()}`;
    setStateSafe((prev) => {
      const newCustom: CustomDhikr = {
        id,
        name: name.trim(),
        arabic: arabic?.trim() || undefined,
        defaultTarget: target,
        builtin: false,
        createdAt: Date.now(),
      };
      return {
        ...prev,
        customDhikrs: [...prev.customDhikrs, newCustom],
        dhikrStates: {
          ...prev.dhikrStates,
          [id]: { count: 0, target, lastUsedAt: null },
        },
      };
    });
    return id;
  };

  const updateCustomDhikr: StoreValue["updateCustomDhikr"] = (id, input) => {
    setStateSafe((prev) => {
      const idx = prev.customDhikrs.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const next = [...prev.customDhikrs];
      next[idx] = {
        ...next[idx],
        name: input.name?.trim() || next[idx].name,
        arabic:
          input.arabic !== undefined
            ? input.arabic.trim() || undefined
            : next[idx].arabic,
        defaultTarget: input.target ?? next[idx].defaultTarget,
      };
      const curSt = prev.dhikrStates[id];
      const nextStates = { ...prev.dhikrStates };
      if (input.target !== undefined && curSt) {
        nextStates[id] = { ...curSt, target: input.target };
      }
      return { ...prev, customDhikrs: next, dhikrStates: nextStates };
    });
  };

  const deleteCustomDhikr: StoreValue["deleteCustomDhikr"] = (id) => {
    setStateSafe((prev) => {
      const nextStates = { ...prev.dhikrStates };
      delete nextStates[id];
      const nextActive =
        prev.activeDhikrId === id ? "subhanallah" : prev.activeDhikrId;
      return {
        ...prev,
        customDhikrs: prev.customDhikrs.filter((c) => c.id !== id),
        dhikrStates: nextStates,
        activeDhikrId: nextActive,
      };
    });
  };

  const incEsma: StoreValue["incEsma"] = (no) => {
    setStateSafe((prev) => ({
      ...prev,
      esmaCounters: { ...prev.esmaCounters, [no]: (prev.esmaCounters[no] || 0) + 1 },
    }));
  };

  const resetEsma: StoreValue["resetEsma"] = (no) => {
    setStateSafe((prev) => ({
      ...prev,
      esmaCounters: { ...prev.esmaCounters, [no]: 0 },
    }));
  };

  const toggleEsmaFavorite: StoreValue["toggleEsmaFavorite"] = (no) => {
    setStateSafe((prev) => {
      const has = prev.esmaFavorites.includes(no);
      return {
        ...prev,
        esmaFavorites: has
          ? prev.esmaFavorites.filter((n) => n !== no)
          : [...prev.esmaFavorites, no],
      };
    });
  };

  const updateSettings: StoreValue["updateSettings"] = (patch) => {
    setStateSafe((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const setTesbihatProgress: StoreValue["setTesbihatProgress"] = ({
    stepIdx,
    count,
  }) => {
    setStateSafe((prev) => ({
      ...prev,
      tesbihatProgress: { stepIdx, count, updatedAt: Date.now() },
    }));
  };

  const clearTesbihatProgress: StoreValue["clearTesbihatProgress"] = () => {
    setStateSafe((prev) =>
      prev.tesbihatProgress === null
        ? prev
        : { ...prev, tesbihatProgress: null }
    );
  };

  const finishOnboarding: StoreValue["finishOnboarding"] = () => {
    setStateSafe((prev) => ({
      ...prev,
      settings: { ...prev.settings, onboardingDone: true },
    }));
  };

  const resetAllStats: StoreValue["resetAllStats"] = () => {
    setStateSafe((prev) => {
      const nextStates: Record<string, DhikrState> = {};
      for (const k of Object.keys(prev.dhikrStates)) {
        nextStates[k] = { ...prev.dhikrStates[k], count: 0 };
      }
      return {
        ...prev,
        dhikrStates: nextStates,
        totalCount: 0,
        dailyLog: {},
        esmaCounters: {},
        // Bu, "Tüm Verileri Sıfırla" — bilerek TAM sifirlama, kumulatif
        // gecmis de dahil. (Sadece aktif zikir "Sıfırla" bunu ETKİLEMEZ.)
        dhikrHistoryTotals: {},
        tesbihatProgress: null,
      };
    });
    undoStack.current = [];
  };

  const todayTotal: StoreValue["todayTotal"] = () => {
    const e = state.dailyLog[todayKey()];
    return e?.total || 0;
  };

  const weeklyTotals: StoreValue["weeklyTotals"] = () => {
    const out: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      out.push({ date: k, total: state.dailyLog[k]?.total || 0 });
    }
    return out;
  };

  const monthlyTotal: StoreValue["monthlyTotal"] = () => {
    let sum = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      sum += state.dailyLog[k]?.total || 0;
    }
    return sum;
  };

  const topDhikrs: StoreValue["topDhikrs"] = (limit = 3) => {
    // BUG-004 duzeltmesi: canli sayac degil, KUMULATIF gecmis toplaminden
    // okunur — "Sıfırla" bu listeyi etkilemez.
    return [...allDhikrs]
      .map((d) => ({
        id: d.id,
        name: d.name,
        count: (state.dhikrHistoryTotals || {})[d.id] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const theme = getTheme(state.settings.theme);

  const value: StoreValue = {
    state,
    theme,
    loaded,
    allDhikrs,
    activeDhikr,
    activeDhikrState,
    increment,
    incrementDhikrById,
    undo,
    reset,
    setActiveDhikr,
    setTargetForActive,
    addCustomDhikr,
    updateCustomDhikr,
    deleteCustomDhikr,
    incEsma,
    resetEsma,
    toggleEsmaFavorite,
    updateSettings,
    setTesbihatProgress,
    clearTesbihatProgress,
    finishOnboarding,
    resetAllStats,
    todayTotal,
    weeklyTotals,
    monthlyTotal,
    topDhikrs,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}

// Convenience
export const themeExport = { darkTheme, lightTheme };
export { CONTAINER_KEY };
