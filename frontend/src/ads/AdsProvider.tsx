// AdsProvider — UMP consent akışı + AdMob SDK initialize + canRequestAds context.
// Expo Go / Web'de tamamen pasif (children'ı olduğu gibi render eder, sdk yok).
//
// Politika:
//  1) FAIL-CLOSED. Onay durumu güvenilir biçimde belirlenemiyorsa reklam
//     İSTENMEZ. Karar daima UMP'nin `canRequestAds` alanından gelir.
//  2) SDK bir kez initialize edilir; reklam isteği yalnızca izin varsa.
//  3) Yeniden deneme SADECE ağ/form hatasında yapılır — kullanıcı onayı
//     bilinçli reddettiyse tekrar tekrar form gösterilmez.
//  4) AdMob politikası: onay veren kullanıcının tercihini değiştirebilmesi
//     için "Gizlilik Seçenekleri" formu (Ayarlar ekranından açılır).
//  5) Uygulama içeriği genel izleyiciye uygun olduğu için maksimum reklam
//     içerik derecesi "G".

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
import { AppState } from "react-native";

import { adsEnabled, adTestDeviceIds } from "./adConfig";
import { getAdsSdk, type ConsentInfo } from "./sdk";

interface AdsContextValue {
  canRequestAds: boolean;
  adsEnabled: boolean;
  /** UMP: kullanıcıya "Gizlilik Seçenekleri" girişi sunulmalı mı? */
  privacyOptionsRequired: boolean;
  /** Ayarlar ekranından çağrılır — UMP onay formunu yeniden açar. */
  showPrivacyOptions: () => Promise<void>;
}

const AdsContext = createContext<AdsContextValue>({
  canRequestAds: false,
  adsEnabled: false,
  privacyOptionsRequired: false,
  showPrivacyOptions: async () => {},
});

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}

export function AdsProvider({ children }: PropsWithChildren) {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const running = useRef(false);
  const initialized = useRef(false);
  const aliveRef = useRef(true);
  // Yeniden deneme YALNIZCA ag/form hatasinda; kullanici reddettiyse hayir.
  const retryOnForeground = useRef(false);

  const bootstrap = useCallback(async () => {
    if (!adsEnabled) return;
    if (running.current) return;
    running.current = true;

    try {
      const sdk = getAdsSdk();
      if (!sdk) return;

      // ═══════════════════════════════════════════════════════════════
      // UMP ONAY AKISI — FAIL-CLOSED
      //
      // ONCEKI SURUMDEKI CIDDI HATA:
      //   `getConsentInfo()` basarisiz oldugunda kod `allowed = true`
      //   yapiyordu; yani onay durumu BILINMEDIGI halde reklam istemeye
      //   izin veriliyordu. AB/Ingiltere'deki bir kullanici icin bu, onay
      //   alinmadan reklam istemek anlamina gelebilirdi → GDPR ve
      //   Google "EU user consent policy" ihlali riski.
      //
      // YENI DAVRANIS: onay durumu guvenilir bicimde belirlenemiyorsa
      // reklam ISTENMEZ. "Herhalde uygundur" varsayimi yapilmaz.
      //
      // `gatherConsent()` = requestInfoUpdate + loadAndShowConsentFormIfRequired
      // ve guncel bilgiyi dondurur. Form YALNIZCA durum REQUIRED iken
      // gosterilir; kullanici bir kez yanitladiktan sonra tekrar acilmaz —
      // yani kullanici her acilista onay ekranina bogulmaz.
      // ═══════════════════════════════════════════════════════════════
      let info: ConsentInfo | null = null;
      let attemptFailed = false;

      try {
        info = await sdk.AdsConsent.gatherConsent();
      } catch (e) {
        attemptFailed = true;
        console.warn("[ads] UMP gatherConsent failed", e);
        // Form/ag hatasi: SDK'nin CIHAZDA SAKLI onay durumunu okumayi dene.
        // UMP karari yerel olarak onbellege alir; cevrimdisiyken de onceki
        // gecerli onay okunabilir.
        try {
          info = await sdk.AdsConsent.getConsentInfo();
        } catch (e2) {
          console.warn("[ads] getConsentInfo also failed", e2);
          info = null;
        }
      }

      // Bilgi yoksa → reklam YOK. Bilincli fail-closed.
      const allowed = !!info?.canRequestAds;
      if (!allowed) {
        console.log(
          `[ads] canRequestAds=false (status=${
            info?.status ?? "bilinmiyor"
          }) — reklam istenmeyecek`
        );
      }

      const req = info?.privacyOptionsRequirementStatus;
      if (aliveRef.current) {
        setPrivacyOptionsRequired(req === "REQUIRED" || req === "required");
      }

      // Sadece ag/form hatasinda tekrar dene.
      retryOnForeground.current = attemptFailed;

      if (!aliveRef.current) return;

      // 3) SDK'yı yalnızca BİR KEZ initialize et.
      if (!initialized.current) {
        try {
          await sdk.mobileAds().setRequestConfiguration?.({
            // Uygulama tüm yaş grupları için uygun bir ibadet uygulamasıdır.
            maxAdContentRating: sdk.MaxAdContentRating?.G ?? "G",
            tagForChildDirectedTreatment: false,
            tagForUnderAgeOfConsent: false,
            // Test reklam BİRİMLERİ kaldırıldı; kendi cihazında güvenle test
            // etmek isteyen geliştirici .env içine cihaz kimliğini yazar.
            // Bu yöntem GERÇEK birimi kullanır, yalnızca bu cihaza test
            // reklamı sunar (Google'ın önerdiği güvenli yol).
            testDeviceIdentifiers: adTestDeviceIds,
          });
          if (adTestDeviceIds.length > 0) {
            console.warn(
              `[ads] TEST CİHAZI MODU AKTİF (${adTestDeviceIds.length} cihaz). ` +
                "Yayın build'inde EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS boş olmalıdır."
            );
          }
        } catch (e) {
          console.warn("[ads] setRequestConfiguration failed", e);
        }
        try {
          await sdk.mobileAds().initialize();
          initialized.current = true;
          console.log("[ads] mobileAds initialize OK");
        } catch (e) {
          console.warn("[ads] mobileAds initialize failed", e);
          return;
        }
      }

      if (aliveRef.current) setCanRequestAds(allowed);
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    bootstrap();
    return () => {
      aliveRef.current = false;
    };
  }, [bootstrap]);

  // Ilk acilista ag yoksa reklam bir daha hic yuklenmesin istemiyoruz:
  // uygulama one geldiginde tekrar dene — AMA yalnizca onceki deneme
  // HATA aldiysa. Kullanici onayi bilincli reddettiyse tekrar denemek
  // kullaniciyi formla rahatsiz etmek olurdu (Google da bunu istemiyor).
  useEffect(() => {
    if (!adsEnabled) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && !canRequestAds && retryOnForeground.current) {
        bootstrap();
      }
    });
    return () => sub.remove();
  }, [bootstrap, canRequestAds]);

  const showPrivacyOptions = useCallback(async () => {
    const sdk = getAdsSdk();
    if (!sdk?.AdsConsent?.showPrivacyOptionsForm) return;
    try {
      const info = await sdk.AdsConsent.showPrivacyOptionsForm();
      if (info && typeof info.canRequestAds === "boolean") {
        setCanRequestAds(info.canRequestAds);
      }
    } catch (e) {
      console.warn("[ads] showPrivacyOptionsForm failed", e);
    }
  }, []);

  const value = useMemo<AdsContextValue>(
    () => ({
      canRequestAds,
      adsEnabled,
      privacyOptionsRequired,
      showPrivacyOptions,
    }),
    [canRequestAds, privacyOptionsRequired, showPrivacyOptions]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}
