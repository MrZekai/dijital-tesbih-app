// Zikirhane global store — React Context + AsyncStorage persistence.
// Tüm veriler cihaz içinde saklanır (offline).
//
// v1.1.0 değişiklikleri:
//  - Şema ve migration `./migration.ts` içine taşındı (test edilebilir,
//    saf fonksiyonlar). Kalıcı anahtar `zikirhane:v1` DEĞİŞMEDİ.
//  - Favoriler, son kullanılanlar ve seri (streak) eklendi.
//  - Tema tercihi artık "system" olabilir; somut tema cihaz şemasıyla
//    birleştirilerek çözülür.
//  - Zikir adları çeviri anahtarlarına taşındığı için `topDhikrs()` artık
//    ad DÖNDÜRMEZ; yalnızca id + sayım döndürür, adı arayüz çözer.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, useColorScheme } from "react-native";

import { storage } from "@/src/utils/storage";

import { BUILTIN_DHIKRS, type AnyDhikr, type CustomDhikr } from "./dhikrs";
import {
  RECENT_LIMIT,
  STORAGE_KEY,
  computeStreak,
  dateKey,
  defaultState,
  migrateState,
  type DailyLogEntry,
  type DhikrState,
  type PersistedState,
  type Settings,
  type StreakInfo,
  type TesbihatProgress,
} from "./migration";
import {
  darkTheme,
  getTheme,
  lightTheme,
  resolveThemeName,
  type ThemeTokens,
} from "./theme";

export type {
  DailyLogEntry,
  DhikrState,
  PersistedState,
  Settings,
  TesbihatProgress,
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
  const key = dateKey();
  const prevEntry: DailyLogEntry = prev.dailyLog[key] || {
    date: key,
    total: 0,
    perDhikr: {},
  };
  const newEntry: DailyLogEntry = {
    date: key,
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
    dailyLog: { ...prev.dailyLog, [key]: newEntry },
    dhikrHistoryTotals: {
      ...(prev.dhikrHistoryTotals || {}),
      [id]: ((prev.dhikrHistoryTotals || {})[id] || 0) + 1,
    },
    // Son kullanılanlar: en yeni başta, tekrar yok, sınırlı uzunluk.
    recentDhikrIds: [
      id,
      ...(prev.recentDhikrIds || []).filter((x) => x !== id),
    ].slice(0, RECENT_LIMIT),
    lastActionAt: now,
  };
  return { next, justReachedTarget, dateKey: key };
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
  toggleFavoriteDhikr: (id: string) => void;
  isFavoriteDhikr: (id: string) => boolean;
  incEsma: (no: number) => void;
  resetEsma: (no: number) => void;
  toggleEsmaFavorite: (no: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setTesbihatProgress: (p: { stepIdx: number; count: number }) => void;
  clearTesbihatProgress: () => void;
  finishOnboarding: () => void;
  resetAllStats: () => void;
  // stats helpers
  todayTotal: () => number;
  weeklyTotals: () => { date: string; total: number }[];
  monthlyTotal: () => number;
  topDhikrs: (limit?: number) => { id: string; count: number }[];
  streak: () => StreakInfo;
}

const StoreContext = createContext<StoreValue | null>(null);

const CONTAINER_KEY = "container";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const systemScheme = useColorScheme();
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
        const raw = await storage.getItem(STORAGE_KEY, null);
        if (raw && typeof raw === "string") {
          const parsed: unknown = JSON.parse(raw);
          const migrated = migrateState(parsed);
          if (migrated) setState(migrated);
        }
      } catch (e) {
        console.warn("[store] load failed", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Guvenli/sik persistans: debounce (200ms) + zorunlu maksimum bekleme
  // (1.5s) + arka plana gecerken aninda flush.
  useEffect(() => {
    if (!loaded) return;
    pendingStateRef.current = state;

    const flushNow = () => {
      const toSave = pendingStateRef.current;
      if (toSave) {
        storage.setItem(STORAGE_KEY, JSON.stringify(toSave));
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
  // ANINDA diske yaz.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        if (pendingStateRef.current) {
          storage.setItem(STORAGE_KEY, JSON.stringify(pendingStateRef.current));
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
      const { next, justReachedTarget: jr, dateKey: key } = applyIncrement(prev, id);
      justReachedTarget = jr;
      undoStack.current.push({ dhikrId: id, dateKey: key, ts: Date.now() });
      if (undoStack.current.length > 200) undoStack.current.shift();
      return next;
    });
    return { justReachedTarget };
  };

  const incrementDhikrById: StoreValue["incrementDhikrById"] = (id) => {
    let justReachedTarget = false;
    setStateSafe((prev) => {
      const { next, justReachedTarget: jr, dateKey: key } = applyIncrement(prev, id);
      justReachedTarget = jr;
      undoStack.current.push({ dhikrId: id, dateKey: key, ts: Date.now() });
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
        dhikrStates: { ...prev.dhikrStates, [id]: { ...cur, count: 0 } },
      };
    });
    undoStack.current = [];
  };

  const setActiveDhikr: StoreValue["setActiveDhikr"] = (id) => {
    setStateSafe((prev) => ({
      ...prev,
      activeDhikrId: id,
      recentDhikrIds: [
        id,
        ...(prev.recentDhikrIds || []).filter((x) => x !== id),
      ].slice(0, RECENT_LIMIT),
    }));
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
        favoriteDhikrIds: (prev.favoriteDhikrIds || []).filter((x) => x !== id),
        recentDhikrIds: (prev.recentDhikrIds || []).filter((x) => x !== id),
      };
    });
  };

  const toggleFavoriteDhikr: StoreValue["toggleFavoriteDhikr"] = (id) => {
    setStateSafe((prev) => {
      const cur = prev.favoriteDhikrIds || [];
      return {
        ...prev,
        favoriteDhikrIds: cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id],
      };
    });
  };

  const isFavoriteDhikr: StoreValue["isFavoriteDhikr"] = (id) =>
    (state.favoriteDhikrIds || []).includes(id);

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
        recentDhikrIds: [],
      };
    });
    undoStack.current = [];
  };

  const todayTotal: StoreValue["todayTotal"] = () => {
    const e = state.dailyLog[dateKey()];
    return e?.total || 0;
  };

  const weeklyTotals: StoreValue["weeklyTotals"] = () => {
    const out: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      out.push({ date: k, total: state.dailyLog[k]?.total || 0 });
    }
    return out;
  };

  const monthlyTotal: StoreValue["monthlyTotal"] = () => {
    let sum = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
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
        count: (state.dhikrHistoryTotals || {})[d.id] || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const streak: StoreValue["streak"] = () => computeStreak(state.dailyLog);

  const themeName = resolveThemeName(state.settings.theme, systemScheme);
  const theme = getTheme(themeName);

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
    toggleFavoriteDhikr,
    isFavoriteDhikr,
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
    streak,
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
