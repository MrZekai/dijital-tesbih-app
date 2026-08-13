// useRespectfulInterstitial — sekme gecislerinde / tesbihat sonrasi interstitial.
//
// KRITIK KOK NEDEN DUZELTMESI (QA BUG-001):
// `sdk.useInterstitialAd()` (react-native-google-mobile-ads) her cagirildiginda
// YENI bir obje referansi dondurur ({...state, load, show}) — internal
// useReducer state'i degismese bile obje literal'i her render'da yeniden
// olusturulur. Bu obje onceden useEffect bagimliligi olarak kullaniliyordu:
//   useEffect(() => { interstitial.load(); }, [..., interstitial, attempts])
// Global store (StoreProvider) her zikir dokunusunda TUM context tuketicilerini
// yeniden render ettigi icin, bu efekt HER DOKUNUSTA yeniden tetikleniyor,
// `load()`u tekrar tekrar cagiriyor, bu da AdMob event'lerini (LOADED/ERROR)
// tetikleyip kutuphanenin kendi useReducer'ini guncelliyor (_handleAdEvent) →
// tekrar render → tekrar efekt → tekrar load()... Hizli/uzun dokunus
// oturumlarinda bu döngü "Maximum update depth exceeded" crash'ine ve
// dolayisiyla oturum veri kaybina yol aciyordu.
//
// COZUM: `interstitial` objesinin KENDISINI hicbir efektin bagimlilik
// dizisine KOYMUYORUZ. En guncel referansi bir ref'te tutup, load() cagrisini
// sadece PRIMITIVE bagimliliklar (adsEnabled/canRequestAds/attempts)
// degistiginde ve her "attempt" icin TEK SEFER tetikliyoruz.

import { useCallback, useEffect, useRef, useState } from "react";

import { interstitialUnitId, INTERSTITIAL_COOLDOWN_MS } from "./adConfig";
import { useAds } from "./AdsProvider";
import { getAdsSdk } from "./sdk";

type InterstitialHookReturn = {
  isLoaded: boolean;
  load: () => void;
  show: () => Promise<void>;
  error?: Error | null;
};

export function useRespectfulInterstitial(): (
  continueAction?: () => void
) => Promise<void> {
  const { canRequestAds, adsEnabled } = useAds();
  const sdk = getAdsSdk();
  const lastShown = useRef(0);
  const [attempts, setAttempts] = useState(0);

  const interstitial = sdk?.useInterstitialAd?.(interstitialUnitId) as
    | InterstitialHookReturn
    | undefined;

  // KRITIK: her render'da en guncel objeyi ref'e yaz (render govdesinde,
  // efekt disinda) — bu bir state guncellemesi degil, sadece "en son deger"
  // deseni; render dongusune girmez.
  const interstitialRef = useRef<InterstitialHookReturn | undefined>(
    interstitial
  );
  interstitialRef.current = interstitial;

  // Her "attempt" icin en fazla BIR kez load() cagir. `interstitial` objesinin
  // referans degisimine ASLA tepki vermeyiz — bu, dongunun kokudur.
  const loadedForAttempt = useRef<number>(-1);
  useEffect(() => {
    if (!adsEnabled) {
      console.log("[ads:interstitial] disabled (Expo Go/web)");
      return;
    }
    if (!canRequestAds) {
      console.log("[ads:interstitial] waiting for consent/init");
      return;
    }
    if (loadedForAttempt.current === attempts) {
      // Bu attempt icin zaten load() cagrildi — tekrar cagirma (dongu koruma).
      return;
    }
    const current = interstitialRef.current;
    if (!current) {
      console.warn("[ads:interstitial] hook returned undefined");
      return;
    }
    loadedForAttempt.current = attempts;
    console.log(
      `[ads:interstitial] load requested unitId=${interstitialUnitId} attempt=${attempts}`
    );
    try {
      current.load();
    } catch (e) {
      console.warn("[ads:interstitial] load threw", e);
    }
    // NOT: `interstitial` bilerek bagimlilik dizisinde degil (kararli
    // olmayan referans → sonsuz dongu riski). Sadece primitive degerler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adsEnabled, canRequestAds, attempts]);

  // isLoaded/error degistiginde sadece log — state guncellemesi YOK, bu
  // yuzden dongu riski tasimiyor.
  const lastLoggedRef = useRef<string>("");
  useEffect(() => {
    if (!interstitial) return;
    const key = `${interstitial.isLoaded}:${
      interstitial.error ? String(interstitial.error) : "none"
    }`;
    if (lastLoggedRef.current === key) return;
    lastLoggedRef.current = key;
    console.log(
      `[ads:interstitial] state isLoaded=${interstitial.isLoaded} error=${
        interstitial.error ? String(interstitial.error) : "none"
      }`
    );
  }, [interstitial?.isLoaded, interstitial?.error]);

  return useCallback(
    async (continueAction?: () => void) => {
      const now = Date.now();
      const sinceLast = now - lastShown.current;
      const cooled = sinceLast >= INTERSTITIAL_COOLDOWN_MS;

      // Neden gostermedigimizi acik ac diye log'luyoruz.
      if (!adsEnabled) {
        console.log("[ads:interstitial] skip: adsEnabled=false");
        continueAction?.();
        return;
      }
      if (!canRequestAds) {
        console.log("[ads:interstitial] skip: canRequestAds=false (consent bekleniyor)");
        continueAction?.();
        return;
      }
      if (!interstitial) {
        console.warn("[ads:interstitial] skip: hook undefined");
        continueAction?.();
        return;
      }
      if (!interstitial.isLoaded) {
        console.log(
          `[ads:interstitial] skip: not loaded yet (kod dogru, henuz yuklenmedi veya no-fill). error=${
            interstitial.error ? String(interstitial.error) : "none"
          }`
        );
        // Sonraki attempt icin load'u tekrar tetikle
        setAttempts((n) => n + 1);
        continueAction?.();
        return;
      }
      if (!cooled) {
        const remaining = Math.ceil(
          (INTERSTITIAL_COOLDOWN_MS - sinceLast) / 1000
        );
        console.log(
          `[ads:interstitial] skip: cooldown (kalan ${remaining}s / toplam ${
            INTERSTITIAL_COOLDOWN_MS / 1000
          }s)`
        );
        continueAction?.();
        return;
      }

      lastShown.current = now;
      console.log("[ads:interstitial] showing...");
      try {
        await interstitial.show();
        console.log("[ads:interstitial] shown & closed");
      } catch (e) {
        console.warn("[ads:interstitial] show failed", e);
      }
      // Sonraki gosterim icin yeniden yukle
      setAttempts((n) => n + 1);
      continueAction?.();
    },
    [adsEnabled, canRequestAds, interstitial]
  );
}
