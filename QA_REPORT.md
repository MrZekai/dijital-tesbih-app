# QA_REPORT.md — v1.1.0 (versionCode 1029)

Tarih: 2026-09-05 · Branch: `global-v1.1.0` · Taban: `d7f329b` (Play 1.0.21/1028)

## Ortam kısıtı — ÖNEMLİ

Bu çalışma Anthropic bulut konteynerinde yürütüldü. Ağ katmanında
`dl.google.com` ve `repo1.maven.org` **kapalıdır (HTTP 403)**; Android
SDK/NDK kurulamaz, Gradle bağımlılıkları çözülemez ve KVM olmadığı için
emülatör çalıştırılamaz.

Bu nedenle cihaz/derleme gerektiren maddeler **FAIL değil, BLOCKED**
olarak raporlanmıştır. Bunlar senin makinende veya EAS'te çalıştırılmalıdır;
komutlar `RELEASE_COMPATIBILITY_CHECKLIST.md` içindedir.

## Sonuçlar

| # | Test | Sonuç | Not |
|---|---|---|---|
| 1 | ESLint (`yarn lint`) | **PASS** | 0 hata, 0 uyarı |
| 2 | TypeScript (`yarn typecheck`) | **PASS** | `tsc --noEmit` temiz, `strict: true` |
| 3 | Unit/davranış testleri (`yarn test`) | **PASS** | 6 dosya, 0 başarısız |
| 4 | Kalıcı veri migration testleri | **PASS** | `zikirhane:v1` korunuyor, `version: 1` diske yazılmaya devam ediyor, bilinmeyen alanlar korunuyor, `dhikrHistoryTotals` seed mantığı (max, toplama değil) doğrulandı |
| 5 | i18n eksik anahtar kontrolü | **PASS** | 27 dil × 181 anahtar; eksik yok |
| 6 | Bütün dillerin anahtar eşitliği | **PASS** | Fazla/bilinmeyen anahtar yok; çoğul tabanlarının `_other` biçimi her dilde var |
| 7 | RTL layout testleri | **KISMİ PASS** | Statik doğrulama geçti (yön-duyarlı satır/hiza/ikon/yazı yönü). Görsel doğrulama cihazda yapılmalı → BLOCKED |
| 8 | Expo Doctor | **BLOCKED** | `api.expo.dev` erişilemiyor |
| 9 | Android debug build | **BLOCKED** | Android SDK yok |
| 10 | Release/QA APK build | **BLOCKED** | Android SDK yok |
| 11 | Emülatörde temiz kurulum | **BLOCKED** | Emülatör yok |
| 12 | Emülatörde eski sürümden güncelleme | **BLOCKED** | Emülatör yok |
| 13 | 10× cold-start | **BLOCKED** | Emülatör yok |
| 14 | Arka plan/ön plan geçişi | **BLOCKED** | Emülatör yok |
| 15 | 1.000 event Monkey | **BLOCKED** | Emülatör yok |
| 16 | 10.000 event Monkey | **BLOCKED** | Emülatör yok |
| 17 | Logcat crash/ANR/FATAL | **BLOCKED** | Cihaz yok |
| 18 | AdMob test reklamı lifecycle | **BLOCKED** | Cihaz yok — ancak kod yolu artık dev/QA'da otomatik test birimlerine geçiyor |
| 19 | UMP consent testi | **BLOCKED** | Cihaz yok (EEA/UK cihazı gerekir) |
| 20 | Eski kullanıcı verisi korunması | **PASS (statik)** | Migration testleri geçti; cihazda güncelleme testi BLOCKED |

## Statik olarak doğrulanan kritik davranışlar

- `applicationId` = `com.zikirhane.tesbih` — **değişmedi**.
- `versionCode` 1029 > Play'deki 1028; `versionName` 1.1.0.
- AdMob Application ID ve **üretim** banner/app-open birim kimlikleri değişmedi.
- App Open yaşam döngüsü korumaları (`APP_OPEN_RESUME_MIN_BACKGROUND_MS`,
  `APP_OPEN_MIN_INTERVAL_MS`, `fullScreenAdActive`, resume loading gate,
  CLICKED sonrası resume bastırma) **aynen korundu**.
- UMP fail-closed davranışı korundu (izin okunamıyorsa reklam istenmez).
- Sayaç düğmesine basınca reklam gösterilmiyor; interstitial hâlâ kapalı.

## Bilinen riskler

| Risk | Etki | Azaltma |
|---|---|---|
| Yeni native modüller (`expo-file-system`, `expo-sharing`, `expo-localization`) burada derlenemedi | Build hatası olasılığı | İlk EAS build'i internal track'e alınmalı; hata olursa yedekleme özelliği tek commit ile geri alınabilir |
| RTL yalnızca statik doğrulandı | Arapça/Urduca/Farsça/Peştuca/Sorani/Divehi/Şahmuki ekranlarda görsel kayma | Cihazda Arapça ile tam tur atılmalı |
| Dil değişiminde RTL için yeniden başlatma gerekiyor | Kullanıcı ilk anda kısmi yerleşim görebilir | Uygulama açık uyarı gösteriyor; kendi katmanımız çoğu ekranı zaten doğru çiziyor |
| 25 dilde Esmaül Hüsna anlamları İngilizce | Yerelleştirme eksikliği | Uygulama içinde açıkça belirtiliyor; `TRANSLATION_MATRIX.md` içinde `NEEDS_HUMAN_REVIEW` |
| Cihaz üstü reklam/consent akışı test edilmedi | Politika riski | Internal testing'de test reklamlarıyla doğrulanmalı |
