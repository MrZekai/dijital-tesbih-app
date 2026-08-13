# Zikirhane — PRD

## Uygulama
- **Ad:** Zikirhane: Zikirmatik Tesbih (kısa: Zikirhane)
- **Dil:** Türkçe
- **Platform:** Expo (React Native), Android odaklı, iOS uyumlu
- **Veri:** Tamamen çevrimdışı, AsyncStorage
- **Kimlik doğrulama:** Yok (hesap gerekmiyor)

## Kararlar
- Backend/MongoDB kullanılmıyor — server.py boş bırakıldı (default template).
- Yerel bildirim (`expo-notifications`) günlük hatırlatıcı için.
- AdMob entegrasyonu deployment'a bırakıldı.
- Esmaül Hüsna 99 isim yerel JSON (`/app/frontend/src/lib/esma.ts`).
- Varsayılan tema koyu (koyu zümrüt yeşili + lacivert + altın), açık tema seçilebilir.

## Yapı
- `/app/frontend/app/index.tsx` — Splash / açılış
- `/app/frontend/app/onboarding.tsx` — 3 karşılama ekranı
- `/app/frontend/app/(tabs)/index.tsx` — Ana Sayaç (dokunmatik tam alan)
- `/app/frontend/app/(tabs)/zikirlerim.tsx` — Zikir listesi + Namaz Sonrası + Esma
- `/app/frontend/app/(tabs)/istatistikler.tsx` — Günlük/haftalık/aylık, top zikirler
- `/app/frontend/app/(tabs)/ayarlar.tsx` — Tema, ses, titreşim, hedef, hatırlatıcı
- `/app/frontend/app/tesbihat.tsx` — Namaz Sonrası Tesbihat (33x3 otomatik)
- `/app/frontend/app/esma.tsx` — Esmaül Hüsna 99 isim, arama, favoriler, isim başı sayaç
- `/app/frontend/app/custom-dhikr.tsx` — Özel zikir oluştur/düzenle
- `/app/frontend/src/lib/store.tsx` — Global Context + AsyncStorage persistence

## Özellikler (v1)
- 6 hazır zikir + özel zikir + hedef presets (33/99/100/500 + özel)
- Tap ile artan büyük sayaç, hafif titreşim, hedefe ulaşınca success haptic
- Geri Al, Sıfırla (onaylı), Ses, Titreşim, Ekran Açık kontrolleri
- Namaz Sonrası Tesbihat: 33 Sübhanallah → 33 Elhamdülillah → 33 Allahu Ekber otomatik geçiş
- Esmaül Hüsna: 99 isim, arama, favoriler, isim başına ayrı sayaç
- Günlük/haftalık/aylık istatistik + top zikirler + son 7 gün grafik
- Ayarlar: tema, büyük yazı, sade mod, günlük hedef, yerel bildirim (saat/dakika)
- Onboarding (ilk açılış), splash ekran

## Erişilebilirlik
- Büyük Yazı Modu (sayaç ~152pt)
- Sade Kullanım Modu (kontrolleri gizler, yaşlılar için)
- Koyu / Açık tema

## Bilinen kısıtlar / sonraki adımlar
- ✅ **AdMob altyapısı entegre edildi** (react-native-google-mobile-ads@16.4.0 + expo-build-properties)
  - Test reklam ID'leri varsayılan; gerçek ID'ler `.env` üzerinden verilebilir:
    - `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID` (app.json plugin config)
    - `EXPO_PUBLIC_AD_MODE=production`
    - `EXPO_PUBLIC_ANDROID_BANNER_ID`, `EXPO_PUBLIC_IOS_BANNER_ID`
    - `EXPO_PUBLIC_ANDROID_INTERSTITIAL_ID`, `EXPO_PUBLIC_IOS_INTERSTITIAL_ID`
  - Banner: Zikirlerim / İstatistikler / Ayarlar ScrollView'lerinin ALT'ında (yalnızca kullanıcı sayfayı sonuna kadar kaydırınca görünür → yanlış tıklama riski minimum)
  - **Ana Sayfa (sayaç ekranı) reklamsız** — problem statement gereği
  - İnterstitial: yalnızca Namaz Sonrası Tesbihat tamamlanınca "Ana Sayfaya Dön" butonuna basılınca (10 dk cooldown)
  - UMP consent akışı (EEA/UK/Türkiye) entegre — her açılışta çağrılır
  - **Expo Go / web preview'de otomatik devre dışı** — `sdk.web.ts` shim + `isExpoGo` + `isWeb` guard'lar
  - Native dev-client veya production build gerekir (Expo Go'da çalışmaz)
- Bildirimler yalnızca gerçek cihaz / dev build'de çalışır
- Uygulama simgesi ve splash görselinin özgün altın "tesbih halkası + hilal" tasarımıyla değiştirilmesi (mevcut placeholder)
- Uygulama içi hafif "tesbih tanesi sesi" için opsiyonel ses dosyası

## QA Kapanış Testi Düzeltmeleri (v1.0.16 / versionCode 132)
Kapalı test QA raporundaki 16 bulgu (BUG-001…BUG-016) giderildi:
- **BUG-001 (P0, kritik)**: `useRespectfulInterstitial` içinde `interstitial.load()` her
  render'da tekrar tetikleniyordu (kararsız hook-obje referansı efekt
  bağımlılığındaydı) → "Maximum update depth exceeded" crash + oturum veri
  kaybı. Ref-tabanlı + primitive-only bağımlılık deseniyle düzeltildi.
  Persistans da sertleştirildi: 200ms debounce + 1.5s zorunlu maksimum
  bekleme flush + arka plana geçişte anında flush (`src/lib/store.tsx`).
- **BUG-002**: Namaz Sonrası Tesbihat artık `incrementDhikrById()` ile AYNI
  canonical istatistik mekanizmasını kullanıyor (çift sayım yok).
- **BUG-003/014/016**: Ayarlar > Özel hedef artık çalışıyor; ortak
  `src/lib/validation.ts` doğrulayıcısı, açık hata mesajları, `usePathname`
  tabanlı stale-input temizliği.
- **BUG-004**: Yeni `dhikrHistoryTotals` alanı — "En Sık Yapılan Zikirler"
  artık canlı sayaçtan değil kümülatif geçmişten okunuyor (Sıfırla bunu
  etkilemiyor). Geriye dönük uyumluluk migration'ı eklendi.
- **BUG-005/006/009**: Zikir Seç / Hedef Seç / Esma detay sheet'leri native
  `<Modal>`'a taşındı (scroll + Android Geri tuşu otomatik kapatma +
  SurfaceView tabanlı reklamların üstünde render).
- **BUG-007**: Büyük Yazı Modu'nda basamak sayısına göre dinamik font boyutu.
- **BUG-010**: Tesbihat otomatik geçişteki 350ms engelleme penceresi
  kaldırıldı — asama gecisi artık anlık/senkron.
- **BUG-011**: Tüm `textTransform:"uppercase"` kullanımları kaldırıldı,
  Türkçe İ/ı doğru büyük harfli metinler doğrudan yazıldı.
- **BUG-012**: Sürüm artık `expo-application` üzerinden native paketten
  okunuyor (sabit kodlanmış "1.0.0" kaldırıldı).
- **BUG-013**: `SafeAreaProvider initialWindowMetrics` eklendi (açılışta
  status bar altına kayma riski giderildi).
- **BUG-015**: Özel zikir ekleme ekranında aynı isim uyarısı + "Yine de
  Kaydet" onay akışı eklendi.
- **BUG-008 (kasıtlı ertelendi)**: Eşzamanlı çoklu dokunuş desteği, mevcut
  kusursuz tek-dokunuş davranışını bozma riski nedeniyle uygulanmadı (QA'nın
  kendi notunda izin verilen bir karar, kod içinde belgelendi).
- AdMob test ID'leri DEĞİŞTİRİLMEDİ, canlı reklam AÇILMADI (kullanıcı talebi).


---

## v1.0.16 (versionCode 132) — Kapalı Test Finalizasyonu (closed-test)

- **Reklam Ana Anahtarı (ADS_ENABLED)**: `src/ads/adConfig.ts` içine tek
  merkezi `export const ADS_ENABLED = false;` eklendi. `adsEnabled` artık
  `ADS_ENABLED && !isWeb && !isExpoGo`. false iken: banner yüklenmez (statik
  yer tutucu), interstitial/app-open pasif, AdMob ağ istekleri yok, native
  BannerAd mount edilmez, event listener'lar pasif, sekme geçişi doğrudan
  çalışır. `BottomBanner` reklam pasifken null yerine mevcut boyutları
  koruyan statik (tıklanamaz) yer tutucu `<View>` render eder. Tüm reklam
  altyapısı ileride prod için kod tabanında korundu.
- **BUG-004 migration (tam geri-uyumluluk)**: `dhikrHistoryTotals` yoksa,
  `dailyLog[*].perDhikr` toplamı ile canlı sayacın MAKSİMUMU alınır (toplama
  yok → çift sayım yok). Case A=40, B=2000, C=150, D=değişmez (node testiyle
  doğrulandı).
- **BUG-013 safe-area (final)**: Zikirlerim ve İstatistikler ekranları
  `SafeAreaView edges={["top"]}` ile sarıldı; içerik kaydırırken durum
  çubuğunun altında kalır (renk/düzen/kart konumları korunur).
- **Türkçe büyük harf temizliği**: "ZIKIRMATIK"→"ZİKİRMATİK", "Bugun"→"Bugün",
  kullanılmayan `textTransform:"uppercase"` (index.tsx hint stili) kaldırıldı.
- **App Open reload hardening**: `useAppOpenAd.ts` tek yeniden-yükleme yoluna
  indirildi (yalnızca CLOSED event; `show().finally(load)` kaldırıldı).
- **Depo temizliği**: Tüm `*.bak*` yedekleri silindi; `.gitignore`'a
  `*.bak` / `*.bak*` eklendi. yarn.lock korundu.
- Doğrulama: tsc --noEmit ✓ (0 hata), expo lint ✓ (0 hata, 3 önceden var olan
  uyarı), expo-doctor ✓ (18/18). Sürüm 1.0.16 / versionCode 132 / paket
  com.zikirhane.tesbih aynı. ADS_ENABLED=false.
