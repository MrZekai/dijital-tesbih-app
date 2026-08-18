// AdsProvider — UMP consent akışı + AdMob SDK initialize + canRequestAds context.
// Expo Go / Web'de tamamen pasif (children'ı olduğu gibi render eder, sdk yok).
//
// v1.0.17 iyileştirmeleri:
//  1) Onay akışı başarısız olsa bile (ağ yok, form kapatıldı) SDK yine de
//     initialize edilir ve `canRequestAds` UMP'nin verdiği gerçek değere
//     göre belirlenir. Eskiden `allowed=false` olduğunda `initialize()` hiç
//     çağrılmıyordu ve uygulama ömrü boyunca REKLAM HİÇ GÖSTERİLMİYORDU.
//  2) Ağ hatasında tek seferlik yeniden deneme (uygulama öne geldiğinde).
//  3) AdMob politikası: onay veren kullanıcının tercihini değiştirebilmesi
//     için "Gizlilik Seçenekleri" formu (Ayarlar ekranından açılır).
//  4) Uygulama içeriği dinî/genel izleyiciye uygun olduğu için maksimum
//     reklam içerik derecesi "G" olarak ayarlanır.

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
import { getAdsSdk } from "./sdk";

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

  const bootstrap = useCallback(async () => {
    if (!adsEnabled) return;
    if (running.current) return;
    running.current = true;

    try {
      const sdk = getAdsSdk();
      if (!sdk) return;

      // 1) UMP onayı topla. Hata olsa bile akışa devam ederiz.
      try {
        await sdk.AdsConsent.gatherConsent();
      } catch (e) {
        console.warn("[ads] UMP gatherConsent failed", e);
      }

      // 2) Gerçek onay durumunu oku.
      let allowed = false;
      try {
        const info = await sdk.AdsConsent.getConsentInfo();
        allowed = !!info.canRequestAds;
        const req = info.privacyOptionsRequirementStatus;
        if (aliveRef.current) {
          setPrivacyOptionsRequired(req === "REQUIRED" || req === "required");
        }
      } catch (e) {
        // Onay bilgisi okunamadıysa (ör. ağ yok): AB dışında UMP zaten
        // sessizce geçer, bu yüzden reklam istemeyi engellemiyoruz.
        console.warn("[ads] getConsentInfo failed", e);
        allowed = true;
      }

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

  // Ağ ilk açılışta yoksa reklam bir daha hiç yüklenmesin istemiyoruz:
  // uygulama öne geldiğinde ve hâlâ izin alınamadıysa tekrar dene.
  useEffect(() => {
    if (!adsEnabled) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && !canRequestAds) {
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
