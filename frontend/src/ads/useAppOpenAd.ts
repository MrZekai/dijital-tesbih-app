// useAppOpenAd — Uygulama Açılışı (App Open) reklamı.
//
// Reklam birimi (Android): ca-app-pub-1380972808968213/1789210450
//
// ÖNCEKİ SÜRÜMDEKİ HATA
// ─────────────────────
// `lastShown` başlangıçta `Date.now()` ile başlatıldığı için SOĞUK AÇILIŞTA
// (uygulama ilk kez başlatıldığında) reklam 4 dakika boyunca BİLEREK
// atlanıyordu. Kullanıcının "uygulama açılınca reklam çıkmıyor" gözlemi
// tam olarak bundan kaynaklanıyordu. Ayrıca:
//   - `load()` yalnızca mount'ta ve foreground'da çağrılıyor, yükleme
//     tamamlandığında (LOADED) gösterim denenmiyordu.
//   - Aynı anda iki `load()` çakışabiliyordu (yeni instance eskisini
//     eziyordu).
//   - Önbellekteki reklamın 4 saatlik geçerlilik süresi kontrol edilmiyordu.
//
// YENİ DAVRANIŞ
// ────────────
//   1) Mount'ta reklam yüklenir. LOADED olayı, soğuk açılış penceresi
//      (6 sn) içinde gelirse reklam HEMEN gösterilir.
//   2) Uygulama arka plandan öne geldiğinde, 4 dk bekleme süresi dolduysa
//      ve hazır bir reklam varsa gösterilir; yoksa sessizce yeniden yüklenir.
//   3) Reklam kapandığında (CLOSED) bir sonraki gösterim için TEK bir
//      yeniden yükleme yapılır.
//   4) Önbellekteki reklam 4 saatten eskiyse geçersiz sayılır ve yenilenir.
//   5) Gösterim sırasında ikinci bir gösterim tetiklenemez (isShowing kilidi).

import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

import {
  APP_OPEN_COLD_START_WINDOW_MS,
  APP_OPEN_COOLDOWN_MS,
  APP_OPEN_MAX_CACHE_MS,
  adsEnabled,
  appOpenUnitId,
} from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";
import { hasUserInteracted } from "./userActivity";

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
  const cleanupsRef = useRef<(() => void)[]>([]);
  const loadedAtRef = useRef<number>(0);
  const isLoadingRef = useRef(false);
  const isShowingRef = useRef(false);
  // 0 = henüz hiç gösterilmedi → soğuk açılışta bekleme süresi UYGULANMAZ.
  const lastShownRef = useRef<number>(0);
  const coldStartAtRef = useRef<number>(Date.now());
  const coldStartUsedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const clearListeners = () => {
    cleanupsRef.current.forEach((c) => {
      try {
        c();
      } catch {
        // ignore
      }
    });
    cleanupsRef.current = [];
  };

  const isAdUsable = useCallback(() => {
    const ad = adRef.current;
    if (!ad?.loaded) return false;
    // Google: App Open reklamı en fazla 4 saat önbellekte tutulabilir.
    if (Date.now() - loadedAtRef.current > APP_OPEN_MAX_CACHE_MS) return false;
    return true;
  }, []);

  const show = useCallback(
    (reason: string) => {
      const ad = adRef.current;
      if (!ad || isShowingRef.current) return false;
      if (!isAdUsable()) return false;

      isShowingRef.current = true;
      lastShownRef.current = Date.now();
      console.log(`[ads:app-open] showing (${reason})`);
      ad.show()
        .catch((e) => {
          isShowingRef.current = false;
          console.warn("[ads:app-open] show failed", e);
        });
      return true;
    },
    [isAdUsable]
  );

  const load = useCallback(() => {
    if (!adsEnabled) {
      console.log("[ads:app-open] disabled (Expo Go/web veya ADS_ENABLED=false)");
      return;
    }
    if (!canRequestAds) {
      console.log("[ads:app-open] onay/başlatma bekleniyor");
      return;
    }
    if (isLoadingRef.current || isShowingRef.current) return;
    if (isAdUsable()) return; // Zaten hazır ve taze bir reklam var.

    const sdk = getAdsSdk();
    if (!sdk?.AppOpenAd || !sdk?.AdEventType) {
      console.warn("[ads:app-open] SDK export bulunamadı");
      return;
    }

    clearListeners();
    isLoadingRef.current = true;

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
        isLoadingRef.current = false;
        loadedAtRef.current = Date.now();
        console.log(`[ads:app-open] LOADED unitId=${appOpenUnitId}`);

        // ── SOGUK ACILIS KAPISI ──────────────────────────────────────
        // Reklam ancak SU UC KOSULUN HEPSI saglanirsa gosterilir:
        //   1) Bu oturumda soguk acilis reklami henuz gosterilmedi,
        //   2) Acilistan bu yana kisa pencere (bkz. adConfig) asilmadi,
        //   3) KULLANICI HENUZ HICBIR SEYE DOKUNMADI.
        //
        // (3) kritik: kullanici zikir cekmeye baslamissa reklam ekrani
        // kaplamamali. Hem kotu deneyim hem de kazara tiklama (gecersiz
        // trafik) riski. Dokunma olduysa bu oturumun soguk acilis
        // reklami IPTAL edilir; arka plandan donus reklami etkilenmez.
        const sinceColdStart = Date.now() - coldStartAtRef.current;
        const withinWindow = sinceColdStart <= APP_OPEN_COLD_START_WINDOW_MS;
        const untouched = !hasUserInteracted();

        if (!coldStartUsedRef.current && (!withinWindow || !untouched)) {
          // Pencere kacti ya da kullanici zaten kullanmaya basladi →
          // bu oturum icin soguk acilis reklamini kalici olarak kapat.
          coldStartUsedRef.current = true;
          console.log(
            `[ads:app-open] soguk acilis atlandi (pencere=${withinWindow}, dokunulmamis=${untouched})`
          );
        } else if (
          !coldStartUsedRef.current &&
          AppState.currentState === "active"
        ) {
          coldStartUsedRef.current = true;
          show("soğuk açılış");
        }
      });

      const offError = ad.addAdEventListener(AdEventType.ERROR, (err) => {
        isLoadingRef.current = false;
        const e = err as { code?: string; message?: string } | undefined;
        console.warn(
          `[ads:app-open] ERROR code=${e?.code ?? "?"} message="${
            e?.message ?? String(err)
          }" unitId=${appOpenUnitId}`
        );
      });

      const offOpened = ad.addAdEventListener(AdEventType.OPENED, () => {
        isShowingRef.current = true;
        console.log("[ads:app-open] OPENED");
      });

      const offClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
        // TEK yeniden-yükleme yolu: reklam kapandığında.
        isShowingRef.current = false;
        loadedAtRef.current = 0;
        console.log("[ads:app-open] CLOSED → yeniden yükleniyor");
        load();
      });

      cleanupsRef.current = [offLoaded, offError, offOpened, offClosed];

      console.log(`[ads:app-open] load() unitId=${appOpenUnitId}`);
      ad.load();
    } catch (e) {
      isLoadingRef.current = false;
      console.warn("[ads:app-open] load setup threw", e);
    }
  }, [canRequestAds, isAdUsable, show]);

  // İlk yükleme (ve onay geldiğinde tekrar).
  useEffect(() => {
    load();
    return () => {
      clearListeners();
    };
  }, [load]);

  // Soğuk açılış penceresi: onay/SDK hazırlığı gecikirse LOADED olayı
  // pencereden sonra gelir; bu durumda açılış reklamını zorlamayız
  // (kullanıcı zaten uygulamayı kullanmaya başlamıştır).
  useEffect(() => {
    const t = setTimeout(() => {
      coldStartUsedRef.current = true;
    }, APP_OPEN_COLD_START_WINDOW_MS);
    return () => clearTimeout(t);
  }, []);

  // Arka plandan öne dönüş.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const cameToForeground =
        !!appStateRef.current.match(/inactive|background/) && next === "active";
      appStateRef.current = next;
      if (!cameToForeground) return;

      // Reklamın kendisi kapanırken de "active" olayı gelir — kilit varsa geç.
      if (isShowingRef.current) return;

      const sinceLast = Date.now() - lastShownRef.current;
      if (lastShownRef.current > 0 && sinceLast < APP_OPEN_COOLDOWN_MS) {
        const remaining = Math.ceil((APP_OPEN_COOLDOWN_MS - sinceLast) / 1000);
        console.log(`[ads:app-open] atlandı: bekleme süresi (kalan ${remaining}s)`);
        return;
      }

      if (!show("öne geldi")) {
        console.log("[ads:app-open] hazır reklam yok → yükleniyor");
        load();
      }
    });
    return () => sub.remove();
  }, [load, show]);
}
