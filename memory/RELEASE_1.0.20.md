> **TARİHSEL KAYIT:** Bu sürüm v1.0.21 tarafından supersede edilmiştir. Güncel App Open politikası için `RELEASE_1.0.21.md` dosyasını esas alın.

# Zikirmatik: Dijital Tesbih v1.0.20 — Play Store Hardening

**versionName:** 1.0.20
**versionCode:** 1024
**Önceki Play kapalı test:** 1.0.19 (1023), 19 Ağustos 2026

## Bu sürümde korunması gereken kritik değişiklikler

1. **UMP consent güvenliği**
   - `getConsentInfo()` hata verirse `allowed=true` fallback'i YOK.
   - Reklam yalnız UMP `canRequestAds=true` doğruladığında açılır.
   - `gatherConsent()` hata verirse UMP'nin önceki oturum durumu tekrar okunur.
   - Privacy Options sonrasında gerekirse Mobile Ads SDK aynı oturumda initialize edilir.

2. **App Open cold-start davranışı**
   - App Open yönetimi tabs layout'tan root loading/splash seviyesine taşındı.
   - Ana içerik açıldıktan sonra geç yüklenen reklam cold-start için gösterilmez.
   - Cold-start reklam bekleme üst sınırı 3 saniyedir; ağ/reklam hatası açılışı kilitlemez.
   - Background→foreground App Open davranışı 4 dakikalık cooldown ile devam eder.

3. **Android manifest**
   - Kullanılmayan `android.permission.FOREGROUND_SERVICE` engellenir ve
     config plugin ile `tools:node="remove"` uygulanır.
   - expo-audio background/microphone servisleri kaldırılmaya devam eder.
   - `RECORD_AUDIO`, eski storage izinleri ve media-playback FGS engellenmeye devam eder.

4. **Privacy UI**
   - “Yalnızca cihaz” ifadesi sadece zikir/sayaç/ayar verileri için kullanılır.
   - AdMob'un reklam/ölçüm/güvenlik amaçlı üçüncü taraf veri işlemesi açıkça ayrılır.

5. **Uygulama kimliği**
   - Görünen uygulama adı: `Zikirmatik: Dijital Tesbih`
   - Android package: `com.zikirhane.tesbih`

## Emergent için kritik kural
GitHub'daki bu sürümden build alınırken Emergent eski workspace/memory değerlerini
uygulamamalı; `frontend/app.json` içindeki 1.0.20 / 1024 korunmalıdır.
