# BASELINE_AUDIT.md — Doğrulanmış Başlangıç Noktası Denetimi

> Bu belge, kod değiştirilmeden ÖNCE yapılan denetimin sonucudur.
> Tüm iddialar ya kaynak kodda ya da Google Play'den indirilen üretim
> paketinde doğrulanmıştır. Doğrulanamayan hiçbir şey "doğrulandı" olarak
> yazılmamıştır.

| Alan | Değer |
|---|---|
| Denetim tarihi | 2026-09-05 |
| Repository | `https://github.com/MrZekai/dijital-tesbih-app` |
| Denetlenen commit | `d7f329b024a10aa632401ddd690f695bd2fb5204` |
| Commit başlığı | `Fix policy-aligned App Open resume lifecycle` |
| Commit tarihi | 2026-08-20 00:55:40 +0300 |
| Uzak branch durumu | `origin/main` = `d7f329b…` (HEAD ile birebir aynı) |
| Uzak tag | Yok (denetim öncesinde repoda hiç tag bulunmuyordu) |
| Çalışma alanı | Temiz — `git status --porcelain` boş |
| Güvenlik etiketi (bu çalışmada oluşturuldu) | `play-1.0.21-1028` → `d7f329b…` |
| Geliştirme branch'i (bu çalışmada oluşturuldu) | `global-v1.1.0` → `d7f329b…` |

---

## 1. Üretim paketi doğrulaması

İki dosya incelendi:

| Dosya | Boyut | SHA-256 | Ne olduğu |
|---|---|---|---|
| `1028.aab` | 66.183.918 B | `85de60b2f6fb04f0c49db9d8bd6ea5750b2ff2662ec85ca8e1ae258aeea35e8c` | **Play'e yüklenen üretim AAB'si** |
| `1028.apk` | 94.646.676 B | `33f5cb87204081e08822c7918bbf01847d35cf0a68a84112a78ed73f2461ce04` | Play'den indirilmiş, Play tarafından işlenmiş APK |

`1028.aab` dosyasının SHA-256 değeri, verilen beklenen değerle **birebir
eşleşti**. Aşağıdaki manifest/ABI/16 KB ölçümleri Play'den inen APK üzerinden
yapılmıştır (AAB'de bunlar henüz bölünmemiş hâldedir).

| Kontrol | Beklenen | Bulunan | Sonuç |
|---|---|---|---|
| `package` | `com.zikirhane.tesbih` | `com.zikirhane.tesbih` | ✅ |
| `versionCode` | 1028 | **1028** | ✅ |
| `versionName` | 1.0.21 | **1.0.21** | ✅ |
| `minSdkVersion` | 24 | **24** | ✅ |
| `targetSdkVersion` | 36 | **36** | ✅ |
| `compileSdkVersion` | — | 36 (codename 16) | ℹ️ |
| `supportsRtl` | — | **`true`** | ✅ (RTL zaten manifest düzeyinde açık) |
| `allowBackup` | false | **false** | ✅ |
| ABI'lar | 4 mimari | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` | ✅ |
| `extractNativeLibs` | — | `false` | ✅ |

Değerler, APK içindeki ikili `AndroidManifest.xml`'in AXML çözümlemesiyle
okundu — dosya adına veya repodaki `app.json`'a güvenilmedi.

**Repodaki `app.json` içinde `versionCode: 1027` yazıyor.** Play'deki gerçek
değer 1028'dir. Bu tutarsızlık, senin uyarınla birebir örtüşüyor: EAS uzak
sürüm sayacı build sırasında değeri artırdığı için repo geride kalmış.
Sürüm kararı Play'deki 1028'e göre verilmiştir.

### 16 KB bellek sayfası desteği

Yerel kütüphanelerin ELF `PT_LOAD` segment hizalamaları:

| ABI | `p_align` değerleri | Değerlendirme |
|---|---|---|
| `arm64-v8a` | `0x4000` (16 KB) | ✅ 16 KB uyumlu |
| `x86_64` | `0x4000` (16 KB) | ✅ 16 KB uyumlu |
| `armeabi-v7a` | `0x1000`, `0x4000` | ℹ️ İlgisiz — 16 KB sayfa yalnızca 64-bit cihazlarda geçerli |
| `x86` | `0x1000`, `0x4000` | ℹ️ İlgisiz — aynı gerekçe |

Yani 1028 sürümü **16 KB sayfa gereksinimini karşılıyor**. Bu, yalnızca
Expo/RN sürümleri korunduğu sürece geçerlidir; bu çalışmada bağımlılıklar
büyük sürüme yükseltilmediği için özellik korunur.

### İmzalama doğrulaması

#### A) `1028.aab` — UPLOAD (yükleme) sertifikası ✅

AAB, `META-INF/1.RSA` içinde v1/JAR imzası taşıyor (AAB'ler böyle imzalanır).
`keytool -printcert` çıktısı:

```
Owner:   CN=Zikirmatik: Zikirhane, O=Emergent
Issuer:  CN=Zikirmatik: Zikirhane, O=Emergent
Serial:  b9cc0953a838bc3f8243b31c9e412f6e
Valid:   2026-08-03 → 2051-08-03
SHA-256: 94:B7:FE:7C:45:1A:9E:17:D3:12:C8:08:F3:F2:BD:BA:9A:3F:17:03:36:72:17:C9:26:5F:64:6F:48:2D:95:43
SHA-1:   20:2C:B4:3A:22:24:ED:67:76:3E:88:A4:F9:0C:91:8A:62:CE:79:DA
Anahtar: 2048-bit RSA
Bundletool: 1.18.1
```

**Beklenen upload parmak iziyle birebir eşleşti.**
Yeni AAB'nin taşıması gereken parmak izi budur.

#### B) `1028.apk` — PLAY APP SIGNING sertifikası (farklı olması normal)

APK, v1 (JAR) imzası taşımıyor; yalnızca v2 + v3 APK Signing Block
kullanıyor. İmzalama bloğu çözümlenerek sertifika çıkarıldı:

```
Owner:  CN=Android, OU=Android, O=Google Inc., L=Mountain View, ST=California, C=US
SHA-256: E9:96:20:7F:C6:63:2D:0C:E7:F3:A0:DD:41:88:92:67:D3:30:16:31:C9:73:84:EA:AA:BB:7E:22:34:43:20:FE
SHA-1:   3D:2B:E0:24:DB:28:DF:66:D9:75:5A:AD:81:43:D1:93:36:66:FA:0B
Anahtar: 4096-bit RSA
```

Ayrıca `application android:name` değeri `com.pairip.application.Application`
— bu Google Play'in otomatik uygulama koruması (PairIP) katmanıdır.

**Bu ÇOK ÖNEMLİ bir bulgudur ve şöyle yorumlanmalıdır:**

- İndirdiğin APK, **Google Play App Signing anahtarıyla** imzalanmış
  (sertifika sahibi `O=Google Inc.`).
- Senin verdiğin `94:B7:FE:7C:…:95:43` / `CN=Zikirmatik: Zikirhane, O=Emergent`
  parmak izi ise **upload (yükleme) sertifikasıdır** — EAS'in tuttuğu anahtar.
- Bu ikisinin **farklı olması normaldir ve doğru olandır**. Play App Signing
  etkin olduğunda Play, senin upload imzanı doğrular ve paketi kendi
  anahtarıyla yeniden imzalar.
- Sonuç: **hata yok.** Yeni AAB, aynı **upload** anahtarıyla imzalandığı
  sürece Play güncellemeyi kabul eder. Doğrulanması gereken parmak izi
  `94:B7:FE:…:95:43`'tür ve bu ancak yeni AAB üretildikten sonra
  `keytool`/`apksigner` ile kontrol edilebilir.

### Commit ↔ üretim paketi eşleşmesi

Denetlenen commit'in bu sürümde yayında olduğu, APK içindeki
`assets/index.android.bundle` (3.128.980 bayt) taranarak doğrulandı:

| Aranan iz | Bulundu |
|---|---|
| `@zikirhane/app-open-last-shown-v1` | ✅ |
| `APP_OPEN_RESUME_MIN_BACKGROUND_MS` | ✅ |
| `app-open-resume-loading-gate` | ✅ |
| `fullScreenAdActive` | ✅ |
| `resumeGateVisible` | ✅ |
| `ca-app-pub-1380972808968213/1326176029` (banner) | ✅ |
| `ca-app-pub-1380972808968213/1789210450` (app open) | ✅ |
| `zikirhane:v1` (kalıcı veri anahtarı) | ✅ |
| `dhikrHistoryTotals` (v1.0.16 migration alanı) | ✅ |

**Sonuç: `d7f329b…` doğru geliştirme tabanıdır.**

---

## 2. Proje yapısı

```
dijital-tesbih-app/
├── backend/            FastAPI iskeleti — mobil uygulama tarafından KULLANILMIYOR
├── frontend/           Asıl Expo/React Native uygulaması
│   ├── app/            expo-router dosya tabanlı rotalar
│   ├── src/ads/        AdMob + UMP katmanı
│   ├── src/components/ Paylaşılan bileşenler
│   ├── src/lib/        Store, tema, zikirler, esma, ses, bildirim, doğrulama
│   ├── src/utils/      AsyncStorage / SecureStore sarmalayıcısı
│   ├── plugins/        Expo config plugin (manifest temizliği)
│   └── tests/          Node test runner tabanlı davranış testleri
├── memory/             Sürüm notları (1.0.17 / 1.0.20 / 1.0.21)
└── test_reports/       Geçmiş QA çıktıları
```

`backend/server.py` mevcut ancak mobil istemci hiçbir HTTP çağrısı yapmıyor —
uygulama **tamamen çevrimdışı** çalışıyor. Bu, "gereksiz sunucu sistemi ekleme"
talimatınla uyumlu; backend'e dokunulmadı.

## 3. Teknoloji sürümleri (denetim anındaki hâliyle)

| Paket | Sürüm |
|---|---|
| `expo` | 54.0.36 |
| `react-native` | 0.81.5 |
| `react` / `react-dom` | 19.1.0 |
| `expo-router` | 6.0.24 |
| `react-native-google-mobile-ads` | 16.0.3 |
| `react-native-reanimated` | 4.1.1 |
| `react-native-gesture-handler` | 2.28.0 |
| `@react-native-async-storage/async-storage` | 2.2.0 |
| `expo-secure-store` | 15.0.8 |
| `typescript` | 5.9.3 |
| Yeni mimari (`newArchEnabled`) | **açık** |
| Paket yöneticisi | yarn 1.22.22 (`save-exact=true`) |

`date-fns` ve `dayjs` bağımlılık olarak duruyor ama kaynak kodda **hiç
import edilmiyor** (ölü bağımlılık — bkz. Riskler).

## 4. Android izinleri

`app.json` içinde talep edilen: `VIBRATE`, `WAKE_LOCK`, `INTERNET`,
`ACCESS_NETWORK_STATE`, `com.google.android.gms.permission.AD_ID`.

`blockedPermissions` ile engellenen: `RECORD_AUDIO`, `FOREGROUND_SERVICE`,
`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `SYSTEM_ALERT_WINDOW`,
`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.

Üretim manifestinde ayrıca kütüphanelerden gelen izinler görülüyor
(`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `MODIFY_AUDIO_SETTINGS`,
`ACCESS_ADSERVICES_*`, launcher badge izinleri, `USE_BIOMETRIC`, `DUMP`).
Bunlar expo-notifications, expo-audio, expo-secure-store ve Google Mobile Ads
SDK'sının transitif izinleridir. `plugins/withZikirmatikManifestCleanup.js`
zaten bir temizleme katmanı uyguluyor.

## 5. Denetimde tespit edilen riskler

| # | Risk | Şiddet | Not |
|---|---|---|---|
| R-1 | `app.json` `versionCode: 1027` — Play'de 1028 | **Yüksek** | Bu değere güvenilerek release yapılırsa Play "sürüm zaten mevcut" hatası verir. Bu çalışmada 1029'a çekildi. |
| R-2 | Tüm arayüz metinleri bileşenlerin içinde sabit Türkçe | **Yüksek** | Küreselleşmenin önündeki tek yapısal engel. Bu çalışmanın ana konusu. |
| R-3 | `store.tsx` tek bir `zikirhane:v1` JSON'unda her şeyi tutuyor | Orta | Şema değişimi tüm kullanıcı verisini riske atar → migration zorunlu. |
| R-4 | `PersistedState.version` sabit `1`; farklı sürüm gelirse **veri sessizce yok sayılıyor** (`if (parsed.version === 1)`) | **Yüksek** | İleride sürüm artırılırsa eski kullanıcıların verisi kaybolur. Bu çalışmada güvenli migration'a çevrildi. |
| R-5 | `normalizeName()` sabit `tr-TR` locale'i kullanıyor | Orta | Çok dilli sürümde yanlış küçük harfe çevirme. |
| R-6 | `interstitialUnitId` boş, `interstitialEnabled = false` | Düşük | Gelir kaybı; ama kod yolu kapalı olduğu için çökme riski de yok. |
| R-7 | Geliştirme derlemelerinde de **gerçek** reklam birimleri kullanılıyor | **Yüksek (politika)** | Kendi reklamına tıklama → geçersiz trafik riski. Talimatın 9. maddesi gereği düzeltildi. |
| R-8 | `date-fns` + `dayjs` kullanılmıyor | Düşük | Paket boyutu / bakım yükü. |
| R-9 | Tema yalnızca `dark`/`light`; "sistem" seçeneği yok | Düşük | Talimatın 7. maddesinde isteniyor. |
| R-10 | `monthlyTotal()` "son 30 gün" hesaplıyor, takvim ayı değil | Düşük | Etiketle uyumsuz. |
| R-11 | `dailyLog` sınırsız büyüyor (gün başına bir kayıt, hiç budanmıyor) | Düşük | Yıllar içinde JSON şişer. |
| R-12 | `backend/` mobil uygulama tarafından kullanılmıyor | Bilgi | Dokunulmadı. |

## 6. Denetim sonucu

Package kimliği, imzalama modeli veya veri kaybı açısından **çalışmayı
durduracak bir belirsizlik bulunmadı**:

- `applicationId` net ve sabit: `com.zikirhane.tesbih`.
- İmzalama modeli net: Play App Signing açık, upload anahtarı EAS'te.
- Kalıcı veri şeması tek bir anahtarda ve tamamen okunabilir durumda;
  geriye dönük uyumlu migration yazılabilir.

Bu nedenle geliştirmeye devam edildi. Tek gerçek engel, **bu bulut
ortamının Android derlemesi yapamaması**dır (bkz. `QA_REPORT.md`).
