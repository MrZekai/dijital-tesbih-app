// i18n çekirdeği — sağlayıcı, `t()` ve dil değiştirme.
//
// TASARIM KARARLARI
//  1) YENİ bağımlılık eklenmedi. Cihaz dili React Native'in kendi
//     köprülerinden okunur; biçimlendirme `Intl` ile yapılır. Böylece
//     mevcut Expo/RN sürümleri korunur (talimat md. 10).
//  2) Dil tercihi AYRI bir kalıcı anahtarda tutulur:
//     `zikirhane:lang:v1`. Mevcut `zikirhane:v1` durum nesnesine
//     DOKUNULMAZ → eski kullanıcıların verisi hiçbir şekilde etkilenmez.
//  3) Eksik çeviri = çökme değil. Sırayla: seçili dil → İngilizce →
//     anahtarın kendisi. Geliştirmede eksik anahtar bir kez uyarılır.
//  4) RTL: `I18nManager.forceRTL` yalnızca gerçekten değiştiğinde çağrılır
//     ve Android'de tam etki için yeniden başlatma gerekir; kullanıcıya bu
//     açıkça söylenir. Ayrıca uygulama kendi `isRTL` değerini context'ten
//     yayar, böylece yeniden başlatma öncesinde de yazı yönü/hizalama
//     doğru görünür.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { I18nManager, NativeModules, Platform } from "react-native";

import { storage } from "@/src/utils/storage";

import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  getLanguageMeta,
  resolveLanguage,
  type LanguageCode,
  type LanguageMeta,
} from "./languages";
import { formatCounter, formatNumber } from "./format";
import en, {
  type AnyTranslationKey,
  type TranslationKey,
  type TranslationTable,
} from "./locales/en";
import { getTable } from "./locales";
import { pluralCategory } from "./plural";

/** Dil tercihinin kalıcı anahtarı. Mevcut veri anahtarlarından bağımsızdır. */
export const LANGUAGE_STORAGE_KEY = "zikirhane:lang:v1";

export type TranslateValues = Record<string, string | number>;

export interface I18nValue {
  /** Seçili dil kodu. */
  lang: LanguageCode;
  /** `Intl` için BCP-47 etiketi. */
  bcp47: string;
  /** Seçili dil sağdan sola mı? */
  isRTL: boolean;
  /** Kalıcı tercih okundu mu? (ilk kare için) */
  ready: boolean;
  /** Kullanıcı dili elle mi seçti, yoksa cihazdan mı algılandı? */
  explicit: boolean;
  /** RTL yönü değiştiği için yeniden başlatma öneriliyor mu? */
  restartRequired: boolean;
  dismissRestartNotice: () => void;
  languages: LanguageMeta[];
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: AnyTranslationKey, values?: TranslateValues) => string;
  /** Locale'e uygun sayı (binlik ayırıcılı). */
  n: (value: number) => string;
  /** Locale'e uygun sayaç rakamı (ayırıcısız). */
  c: (value: number) => string;
}

const noopValue: I18nValue = {
  lang: DEFAULT_LANGUAGE,
  bcp47: "en",
  isRTL: false,
  ready: false,
  explicit: false,
  restartRequired: false,
  dismissRestartNotice: () => {},
  languages: LANGUAGES,
  setLanguage: async () => {},
  t: (key) => (en as Record<string, string>)[key] ?? key,
  n: (v) => String(v),
  c: (v) => String(v),
};

const I18nContext = createContext<I18nValue>(noopValue);

// ── Cihaz dili algılama ────────────────────────────────────────────────
/**
 * Cihazın dilini yeni bir native bağımlılık eklemeden okur.
 * Kaynaklar sırayla denenir; hiçbiri işe yaramazsa `null` döner.
 */
export function detectDeviceLanguageTag(): string | null {
  const candidates: (string | null | undefined)[] = [];

  // 1) expo-localization — cihazın TERCİH SIRALI dil listesini verir.
  // Kullanıcının ikinci/üçüncü tercihi desteklediğimiz bir dilse onu
  // seçebilmek için hepsini sırayla değerlendiririz. Modül herhangi bir
  // nedenle yüklenemezse (eski native build) sessizce diğer yollara düşeriz.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require("expo-localization") as {
      getLocales?: () => { languageTag?: string }[];
    };
    const locales = Localization?.getLocales?.() ?? [];
    for (const l of locales) candidates.push(l?.languageTag);
  } catch {
    // modül yok / linklenmemiş
  }

  try {
    if (Platform.OS === "android") {
      const constants =
        (NativeModules?.I18nManager as { getConstants?: () => Record<string, unknown> })
          ?.getConstants?.() ?? (NativeModules?.I18nManager as Record<string, unknown>);
      candidates.push(constants?.localeIdentifier as string | undefined);
    } else if (Platform.OS === "ios") {
      const settings = (NativeModules?.SettingsManager as {
        settings?: Record<string, unknown>;
      })?.settings;
      const languages = settings?.AppleLanguages as string[] | undefined;
      candidates.push(languages?.[0]);
      candidates.push(settings?.AppleLocale as string | undefined);
    }
  } catch {
    // native köprü yoksa sessizce devam et
  }

  try {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      candidates.push(new Intl.DateTimeFormat().resolvedOptions().locale);
    }
  } catch {
    // ICU yok
  }

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/**
 * Cihazın tercih sırasına göre DESTEKLENEN ilk dili döndürür.
 * Hiçbiri desteklenmiyorsa `null`.
 */
export function detectSupportedLanguage(): LanguageCode | null {
  const tags: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require("expo-localization") as {
      getLocales?: () => { languageTag?: string }[];
    };
    for (const l of Localization?.getLocales?.() ?? []) {
      if (l?.languageTag) tags.push(l.languageTag);
    }
  } catch {
    // yoksa aşağıdaki tek etiketli yola düşülür
  }
  const single = detectDeviceLanguageTag();
  if (single) tags.push(single);

  for (const tag of tags) {
    const code = resolveLanguage(tag);
    if (code) return code;
  }
  return null;
}

// ── Yer tutucu doldurma ────────────────────────────────────────────────
const PLACEHOLDER = /\{\{(\w+)\}\}/g;

function interpolate(template: string, values?: TranslateValues): string {
  if (!values) return template;
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const v = values[name];
    return v === undefined || v === null ? whole : String(v);
  });
}

/**
 * React ağacı DIŞINDAN (ör. hata sınırı) çeviri okumak için son bilinen dil.
 * Hook kullanılamayan yerlerde `tStatic()` bunu kullanır.
 */
let activeLanguage: LanguageCode = DEFAULT_LANGUAGE;

/** Hook'suz çeviri — yalnızca provider dışındaki nadir yerler için. */
export function tStatic(key: AnyTranslationKey): string {
  const table = getTable(activeLanguage) as Record<string, string | undefined>;
  return table[key] ?? (en as Record<string, string>)[key] ?? key;
}

const warned = new Set<string>();
function warnMissing(lang: string, key: string) {
  if (!__DEV__) return;
  const id = `${lang}:${key}`;
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[i18n] "${key}" eksik (${lang}) → İngilizce kullanıldı`);
}

// ── Sağlayıcı ──────────────────────────────────────────────────────────
export function I18nProvider({ children }: PropsWithChildren) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [explicit, setExplicit] = useState(false);
  const [ready, setReady] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);
  const alive = useRef(true);

  const applyNativeDirection = useCallback(
    (rtl: boolean, notify: boolean) => {
      try {
        I18nManager.allowRTL(true);
        if (I18nManager.isRTL !== rtl) {
          I18nManager.forceRTL(rtl);
          if (notify && alive.current) setRestartRequired(true);
        }
      } catch {
        // Web / test ortamı — yön yönetimi yok.
      }
    },
    []
  );

  // İlk yükleme: kayıtlı tercih varsa onu, yoksa cihaz dilini kullan.
  useEffect(() => {
    alive.current = true;
    (async () => {
      let resolved: LanguageCode = DEFAULT_LANGUAGE;
      let wasExplicit = false;
      try {
        const saved = await storage.getItem(LANGUAGE_STORAGE_KEY, null);
        const savedCode =
          typeof saved === "string" ? resolveLanguage(saved) : null;
        if (savedCode) {
          resolved = savedCode;
          wasExplicit = true;
        } else {
          resolved = detectSupportedLanguage() ?? DEFAULT_LANGUAGE;
        }
      } catch {
        resolved = detectSupportedLanguage() ?? DEFAULT_LANGUAGE;
      }

      if (!alive.current) return;
      setLangState(resolved);
      setExplicit(wasExplicit);
      setReady(true);

      // İlk açılışta yön native tarafla uyumsuzsa sessizce hizala. Bu
      // aşamada henüz hiçbir ekran çizilmediği için yeniden başlatma
      // uyarısı göstermeye gerek yoktur.
      const meta = getLanguageMeta(resolved);
      applyNativeDirection(!!meta?.rtl, false);
    })();
    return () => {
      alive.current = false;
    };
  }, [applyNativeDirection]);

  const setLanguage = useCallback(
    async (code: LanguageCode) => {
      const meta = getLanguageMeta(code);
      if (!meta) return;
      setLangState(meta.code);
      setExplicit(true);
      await storage.setItem(LANGUAGE_STORAGE_KEY, meta.code);
      applyNativeDirection(meta.rtl, true);
    },
    [applyNativeDirection]
  );

  const dismissRestartNotice = useCallback(() => setRestartRequired(false), []);

  const meta = getLanguageMeta(lang) ?? getLanguageMeta(DEFAULT_LANGUAGE)!;
  activeLanguage = meta.code;
  const table: TranslationTable = useMemo(() => getTable(lang), [lang]);

  const t = useCallback(
    (key: AnyTranslationKey, values?: TranslateValues): string => {
      let lookupKey: string = key;

      // Çoğul: `{{count}}` verildiyse `<key>_<kategori>` denenir.
      if (values && typeof values.count === "number") {
        const cat = pluralCategory(meta.code, meta.bcp47, values.count);
        const candidates = [`${key}_${cat}`, `${key}_other`, key];
        lookupKey =
          candidates.find(
            (k) =>
              (table as Record<string, string | undefined>)[k] !== undefined ||
              (en as Record<string, string | undefined>)[k] !== undefined
          ) ?? key;
      }

      const localized = (table as Record<string, string | undefined>)[lookupKey];
      if (localized !== undefined) {
        return interpolate(localized, normalizeValues(values, meta.bcp47));
      }

      const fallback = (en as Record<string, string | undefined>)[lookupKey];
      if (fallback !== undefined) {
        if (meta.code !== "en") warnMissing(meta.code, lookupKey);
        return interpolate(fallback, normalizeValues(values, meta.bcp47));
      }

      warnMissing(meta.code, lookupKey);
      return lookupKey;
    },
    [meta.bcp47, meta.code, table]
  );

  const n = useCallback((value: number) => formatNumber(value, meta.bcp47), [meta.bcp47]);
  const c = useCallback((value: number) => formatCounter(value, meta.bcp47), [meta.bcp47]);

  const value = useMemo<I18nValue>(
    () => ({
      lang: meta.code,
      bcp47: meta.bcp47,
      isRTL: meta.rtl,
      ready,
      explicit,
      restartRequired,
      dismissRestartNotice,
      languages: LANGUAGES,
      setLanguage,
      t,
      n,
      c,
    }),
    [
      c,
      dismissRestartNotice,
      explicit,
      meta.bcp47,
      meta.code,
      meta.rtl,
      n,
      ready,
      restartRequired,
      setLanguage,
      t,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Sayısal değerleri locale'e uygun rakamlarla yer tutuculara koyar. */
function normalizeValues(
  values: TranslateValues | undefined,
  bcp47: string
): TranslateValues | undefined {
  if (!values) return values;
  const out: TranslateValues = {};
  for (const [k, v] of Object.entries(values)) {
    out[k] = typeof v === "number" ? formatNumber(v, bcp47) : v;
  }
  return out;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Kısa yol: yalnızca `t` gerektiğinde. */
export function useT(): I18nValue["t"] {
  return useContext(I18nContext).t;
}

export type { AnyTranslationKey, LanguageCode, LanguageMeta, TranslationKey };
