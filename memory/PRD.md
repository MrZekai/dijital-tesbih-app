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
