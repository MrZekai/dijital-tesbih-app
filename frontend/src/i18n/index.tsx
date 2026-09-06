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
import { AppState, I18nManager, NativeModules, Platform } from "react-native";

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

/** Kullanıcının dil TERCİHİ — somut bir dil ya da "cihazı takip et". */
export type LanguagePreference = LanguageCode | "system";

/** `zikirhane:lang:v1` içinde saklanan "cihazı takip et" değeri. */
export const SYSTEM_LANGUAGE = "system" as const;

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
  /** Kayıtlı tercih: somut bir dil ya da "system". */
  preference: LanguagePreference;
  /** Cihazın bildirdiği ham dil etiketi (tanılama/Ayarlar için). */
  deviceTag: string | null;
  /** RTL yönü değiştiği için yeniden başlatma öneriliyor mu? */
  restartRequired: boolean;
  dismissRestartNotice: () => void;
  languages: LanguageMeta[];
  setLanguage: (code: LanguagePreference) => Promise<void>;
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
  preference: SYSTEM_LANGUAGE,
  deviceTag: null,
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

  // 2) React Native'in KENDİ I18nManager'ı. `NativeModules.I18nManager`
  // Yeni Mimari'de (newArchEnabled) null dönebildiği için doğrudan
  // `react-native`ten import edilen nesneyi kullanıyoruz.
  try {
    if (Platform.OS === "android") {
      const c = (I18nManager as unknown as {
        getConstants?: () => { localeIdentifier?: string };
        localeIdentifier?: string;
      });
      candidates.push(c.getConstants?.().localeIdentifier ?? c.localeIdentifier);
      const nm = NativeModules?.I18nManager as
        | { localeIdentifier?: string }
        | undefined;
      candidates.push(nm?.localeIdentifier);
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
  const [preference, setPreference] = useState<LanguagePreference>(SYSTEM_LANGUAGE);
  const [deviceTag, setDeviceTag] = useState<string | null>(null);
  const explicit = preference !== SYSTEM_LANGUAGE;
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
      const tag = detectDeviceLanguageTag();
      let pref: LanguagePreference = SYSTEM_LANGUAGE;
      try {
        const saved = await storage.getItem(LANGUAGE_STORAGE_KEY, null);
        if (typeof saved === "string") {
          if (saved === SYSTEM_LANGUAGE) pref = SYSTEM_LANGUAGE;
          else {
            const code = resolveLanguage(saved);
            if (code) pref = code;
          }
        }
      } catch {
        // okunamadıysa cihazı takip et
      }

      const resolved =
        pref === SYSTEM_LANGUAGE
          ? (detectSupportedLanguage() ?? DEFAULT_LANGUAGE)
          : pref;

      if (!alive.current) return;
      setDeviceTag(tag);
      setPreference(pref);
      setLangState(resolved);
      setReady(true);

      if (__DEV__) {
        console.log(
          `[i18n] cihaz="${tag ?? "?"}" tercih="${pref}" secilen="${resolved}"`
        );
      }

      // İlk açılışta yön native tarafla uyumsuzsa sessizce hizala.
      applyNativeDirection(!!getLanguageMeta(resolved)?.rtl, false);
    })();
    return () => {
      alive.current = false;
    };
  }, [applyNativeDirection]);

  // Kullanıcı telefonun dilini değiştirip uygulamaya dönerse ve tercih
  // "cihazı takip et" ise arayüz dili de anında güncellenir.
  useEffect(() => {
    if (preference !== SYSTEM_LANGUAGE) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const tag = detectDeviceLanguageTag();
      const code = detectSupportedLanguage() ?? DEFAULT_LANGUAGE;
      if (!alive.current) return;
      setDeviceTag(tag);
      setLangState((cur) => {
        if (cur === code) return cur;
        applyNativeDirection(!!getLanguageMeta(code)?.rtl, true);
        return code;
      });
    });
    return () => sub.remove();
  }, [applyNativeDirection, preference]);

  const setLanguage = useCallback(
    async (code: LanguagePreference) => {
      if (code === SYSTEM_LANGUAGE) {
        const resolved = detectSupportedLanguage() ?? DEFAULT_LANGUAGE;
        setPreference(SYSTEM_LANGUAGE);
        setLangState(resolved);
        await storage.setItem(LANGUAGE_STORAGE_KEY, SYSTEM_LANGUAGE);
        applyNativeDirection(!!getLanguageMeta(resolved)?.rtl, true);
        return;
      }
      const meta = getLanguageMeta(code);
      if (!meta) return;
      setPreference(meta.code);
      setLangState(meta.code);
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
      preference,
      deviceTag,
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
      deviceTag,
      dismissRestartNotice,
      explicit,
      preference,
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

export type {
  AnyTranslationKey,
  LanguageCode,
  LanguageMeta,
  TranslationKey,
};
