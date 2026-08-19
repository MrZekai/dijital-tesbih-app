// AdsProvider — Google UMP consent akışı + AdMob SDK initialize + reklam izni context'i.
// Expo Go / Web'de pasiftir; gerçek native Android build'de çalışır.
//
// v1.0.20 Play Store hardening:
//  1) UMP bilgisi okunamıyorsa artık otomatik reklam izni veren fallback YOK.
//  2) gatherConsent hata verirse UMP'nin önceki oturumdaki `canRequestAds`
//     durumu getConsentInfo() ile okunur; yalnızca doğrulanmış `true` ise SDK başlar.
//  3) SDK initialize işlemi tekilleştirilmiştir; privacy-options sonrası ilk kez
//     reklam izni oluşursa SDK aynı oturumda güvenle initialize edilir.
//  4) `consentReady`, App Open reklamının consent formuyla üst üste binmesini
//     önlemek için ilk UMP değerlendirmesinin tamamlandığını bildirir.

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

type AdsSdk = NonNullable<ReturnType<typeof getAdsSdk>>;

interface AdsContextValue {
  canRequestAds: boolean;
  adsEnabled: boolean;
  /** İlk UMP değerlendirmesi tamamlandı (başarılı veya güvenli hata sonucu). */
  consentReady: boolean;
  /** UMP: kullanıcıya "Gizlilik Seçenekleri" girişi sunulmalı mı? */
  privacyOptionsRequired: boolean;
  /** Ayarlar ekranından çağrılır — UMP gizlilik tercihleri formunu açar. */
  showPrivacyOptions: () => Promise<void>;
  /** Tam ekran reklam görünürken banner gibi diğer reklam yüzeylerini gizle. */
  fullScreenAdActive: boolean;
  setFullScreenAdActive: (active: boolean) => void;
}

const AdsContext = createContext<AdsContextValue>({
  canRequestAds: false,
  adsEnabled: false,
  consentReady: false,
  privacyOptionsRequired: false,
  showPrivacyOptions: async () => {},
  fullScreenAdActive: false,
  setFullScreenAdActive: () => {},
});

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}

export function AdsProvider({ children }: PropsWithChildren) {
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [consentReady, setConsentReady] = useState(!adsEnabled);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [fullScreenAdActive, setFullScreenAdActiveState] = useState(false);

  const running = useRef(false);
  const initialized = useRef(false);
  const initializingPromise = useRef<Promise<boolean> | null>(null);
  const aliveRef = useRef(true);
  const canRequestAdsRef = useRef(false);

  const setAdsAllowed = useCallback((allowed: boolean) => {
    canRequestAdsRef.current = allowed;
    if (aliveRef.current) setCanRequestAds(allowed);
  }, []);

  const setFullScreenAdActive = useCallback((active: boolean) => {
    if (aliveRef.current) setFullScreenAdActiveState(active);
  }, []);

  const updatePrivacyRequirement = useCallback((info: {
    privacyOptionsRequirementStatus?: string;
  }) => {
    const req = info.privacyOptionsRequirementStatus;
    if (aliveRef.current) {
      setPrivacyOptionsRequired(req === "REQUIRED" || req === "required");
    }
  }, []);

  const initializeMobileAds = useCallback(async (sdk: AdsSdk): Promise<boolean> => {
    if (initialized.current) return true;
    if (initializingPromise.current) return initializingPromise.current;

    initializingPromise.current = (async () => {
      try {
        await sdk.mobileAds().setRequestConfiguration?.({
          maxAdContentRating: sdk.MaxAdContentRating?.G ?? "G",
          testDeviceIdentifiers: adTestDeviceIds,
        });

        if (adTestDeviceIds.length > 0) {
          console.warn(
            `[ads] TEST CİHAZI MODU AKTİF (${adTestDeviceIds.length} cihaz). ` +
              "Release build'inde EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS boş olmalıdır."
          );
        }
      } catch (e) {
        // Request configuration hatası SDK initialize'i engellememeli.
        console.warn("[ads] setRequestConfiguration failed", e);
      }

      try {
        await sdk.mobileAds().initialize();
        initialized.current = true;
        console.log("[ads] mobileAds initialize OK");
        return true;
      } catch (e) {
        console.warn("[ads] mobileAds initialize failed", e);
        return false;
      }
    })();

    try {
      return await initializingPromise.current;
    } finally {
      initializingPromise.current = null;
    }
  }, []);

  /**
   * UMP'nin mevcut canRequestAds değerini okur. İlk kez okunamıyorsa reklamı
   * açmaz; aynı oturumda daha önce doğrulanmış izin varsa geçici okuma hatası
   * o doğrulanmış durumu keyfi biçimde değiştirmez.
   */
  const syncConsentAndSdk = useCallback(
    async (sdk: AdsSdk): Promise<boolean> => {
      try {
        const info = await sdk.AdsConsent.getConsentInfo();
        updatePrivacyRequirement(info);

        if (!info.canRequestAds) {
          setAdsAllowed(false);
          return false;
        }

        const sdkReady = await initializeMobileAds(sdk);
        setAdsAllowed(sdkReady);
        return sdkReady;
      } catch (e) {
        console.warn("[ads] getConsentInfo failed; reklam izni varsayılmıyor", e);
        // Kritik: UNKNOWN/error => true fallback yok.
        // Bu oturumda daha önce doğrulanmış bir true varsa onu koruyoruz;
        // ilk açılıştaki belirsizlikte false kalır.
        if (!canRequestAdsRef.current) setAdsAllowed(false);
        return canRequestAdsRef.current;
      }
    },
    [initializeMobileAds, setAdsAllowed, updatePrivacyRequirement]
  );

  const bootstrap = useCallback(async () => {
    if (!adsEnabled) {
      if (aliveRef.current) setConsentReady(true);
      return;
    }
    if (running.current) return;
    running.current = true;

    try {
      const sdk = getAdsSdk();
      if (!sdk) {
        setAdsAllowed(false);
        return;
      }

      // Her app start/yeniden denemede UMP bilgisini güncelle ve gerekirse formu
      // göster. Hata olursa UMP önceki oturumdaki geçerli durumu kullanabilir;
      // bunun için aşağıda getConsentInfo() ile gerçek canRequestAds okunur.
      try {
        await sdk.AdsConsent.gatherConsent();
      } catch (e) {
        console.warn("[ads] UMP gatherConsent failed; önceki consent durumu kontrol edilecek", e);
      }

      await syncConsentAndSdk(sdk);
    } finally {
      running.current = false;
      if (aliveRef.current) setConsentReady(true);
    }
  }, [setAdsAllowed, syncConsentAndSdk]);

  useEffect(() => {
    aliveRef.current = true;
    bootstrap();
    return () => {
      aliveRef.current = false;
    };
  }, [bootstrap]);

  // İlk açılışta ağ/UMP geçici olarak başarısızsa uygulama tekrar aktif
  // olduğunda yeniden dene. UMP gerekli değilse veya kullanıcı karar verdiyse
  // canRequestAds zaten true olacağından gereksiz form döngüsü oluşmaz.
  useEffect(() => {
    if (!adsEnabled) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && !canRequestAdsRef.current) {
        bootstrap();
      }
    });
    return () => sub.remove();
  }, [bootstrap]);

  const showPrivacyOptions = useCallback(async () => {
    const sdk = getAdsSdk();
    if (!sdk?.AdsConsent?.showPrivacyOptionsForm) return;

    try {
      const info = await sdk.AdsConsent.showPrivacyOptionsForm();
      if (info) updatePrivacyRequirement(info);
      // Kullanıcı tercihini değiştirdiyse aynı oturumda yeni canRequestAds
      // değerini oku ve gerekirse SDK'yı ilk kez initialize et.
      await syncConsentAndSdk(sdk);
    } catch (e) {
      console.warn("[ads] showPrivacyOptionsForm failed", e);
    }
  }, [syncConsentAndSdk, updatePrivacyRequirement]);

  const value = useMemo<AdsContextValue>(
    () => ({
      canRequestAds,
      adsEnabled,
      consentReady,
      privacyOptionsRequired,
      showPrivacyOptions,
      fullScreenAdActive,
      setFullScreenAdActive,
    }),
    [
      canRequestAds,
      consentReady,
      privacyOptionsRequired,
      showPrivacyOptions,
      fullScreenAdActive,
      setFullScreenAdActive,
    ]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}
