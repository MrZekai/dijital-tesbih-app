// useAppOpenAd - Uygulama acilis reklami (App Open) + tam olay tanilamasi.
//
// TANI: Kullanici acilis reklaminin cikmadigini bildirdi. Muhtemel sebepler:
//   1) Ilk soguk acilista bilerek atliyoruz (lastShown=Date.now() init).
//   2) Yukleme AdMob'da hata verirse `ad.loaded` false kalir → sessizce
//      gosterilmezdi. Simdi AdEventType listener'i ile LOADED/ERROR
//      olaylarini konsola log'luyoruz → gercek sebebi gorursunuz.
//   3) AppState 'active'e dondugunde ad yuklu degilse yeniden `load()`
//      diyoruz, ancak asenkron yukleme sonucunu beklemiyoruz. Ilk foreground
//      transisyonunda ad henuz hazir olmayabilir → gostermez. Ikinci
//      foreground'ta hazir olabilir.
//   4) 4 dk cooldown: kisa aralikli test ederseniz reklam bilerek atlanir.

import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

import { APP_OPEN_COOLDOWN_MS, adsEnabled, appOpenUnitId } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

type AdInstance = {
  load: () => void;
  show: () => Promise<void>;
  loaded: boolean;
  addAdEventListener: (
    type: string,
    listener: (err?: unknown) => void
  ) => () => void;
  removeAllListeners: () => void;
};

export function useAppOpenAd() {
  const { canRequestAds } = useAds();
  const adRef = useRef<AdInstance | null>(null);
  const lastShown = useRef<number>(Date.now());
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const cleanupsRef = useRef<Array<() => void>>([]);

  const load = useCallback(() => {
    const sdk = getAdsSdk();
    if (!adsEnabled) {
      console.log("[ads:app-open] disabled (Expo Go/web)");
      return;
    }
    if (!canRequestAds) {
      console.log("[ads:app-open] waiting for consent/init");
      return;
    }
    if (!sdk?.AppOpenAd || !sdk?.AdEventType) {
      console.warn("[ads:app-open] SDK export bulunamadi");
      return;
    }
    // Onceki listener'lari temizle
    cleanupsRef.current.forEach((c) => {
      try {
        c();
      } catch {
        // ignore
      }
    });
    cleanupsRef.current = [];

    try {
      const AppOpenAd = sdk.AppOpenAd as {
        createForAdRequest: (unitId: string, opts?: object) => AdInstance;
      };
      const ad = AppOpenAd.createForAdRequest(appOpenUnitId, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;

      const AdEventType = sdk.AdEventType;
      const offLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
        console.log(`[ads:app-open] LOADED unitId=${appOpenUnitId}`);
      });
      const offError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
        const e = err as { code?: string; message?: string } | undefined;
        console.warn(
          `[ads:app-open] ERROR code=${e?.code ?? "?"} message="${
            e?.message ?? String(err)
          }" unitId=${appOpenUnitId}`
        );
      });
      const offOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        console.log("[ads:app-open] OPENED (gosteriliyor)");
      });
      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        // TEK yeniden-yükleme yolu: reklam kapandığında (CLOSED) bir sonraki
        // gösterim için yeniden yükleriz. `show().finally()` içindeki ikinci
        // reload yolu KALDIRILDI — böylece tamamlanan bir App Open reklamı
        // tam olarak BİR yeniden-yükleme denemesiyle sonuçlanır (çift
        // yükleme / no-fill spam'i önlenir).
        console.log("[ads:app-open] CLOSED, yeniden yukleniyor...");
        load();
      });

      cleanupsRef.current = [offLoaded, offError, offOpened, offClosed];

      console.log(
        `[ads:app-open] load() cagrildi unitId=${appOpenUnitId}`
      );
      ad.load();
    } catch (e) {
      console.warn("[ads:app-open] load setup threw", e);
    }
  }, [canRequestAds]);

  useEffect(() => {
    load();
    return () => {
      cleanupsRef.current.forEach((c) => {
        try {
          c();
        } catch {
          // ignore
        }
      });
      cleanupsRef.current = [];
    };
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const cameToForeground =
        appState.current.match(/inactive|background/) && next === "active";
      appState.current = next;
      if (!cameToForeground) return;

      const now = Date.now();
      const sinceLast = now - lastShown.current;
      if (sinceLast < APP_OPEN_COOLDOWN_MS) {
        const remaining = Math.ceil(
          (APP_OPEN_COOLDOWN_MS - sinceLast) / 1000
        );
        console.log(
          `[ads:app-open] skip: cooldown (kalan ${remaining}s / toplam ${
            APP_OPEN_COOLDOWN_MS / 1000
          }s)`
        );
        return;
      }

      const ad = adRef.current;
      if (!ad?.loaded) {
        console.log(
          `[ads:app-open] skip: not loaded, load() tekrar cagriliyor`
        );
        load();
        return;
      }
      lastShown.current = now;
      console.log("[ads:app-open] showing...");
      // NOT: yeniden yükleme TEK yoldan yapılır → CLOSED event listener'ı.
      // Burada `.finally(load)` KULLANILMAZ (aksi halde iki reload yolu
      // oluşurdu). show() hata verirse zaten reklam tamamlanmamıştır; bir
      // sonraki foreground geçişinde `!ad.loaded` kontrolü load()'u tetikler.
      ad.show().catch((e) => console.warn("[ads:app-open] show failed", e));
    });
    return () => sub.remove();
  }, [load]);
}
