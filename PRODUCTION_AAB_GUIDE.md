# Üretim AAB Kılavuzu — 1.1.0 / 1029

Bu belge, Google Play'deki **Zikirmatik: Dijital Tesbih** uygulamasının
**1.0.21 / 1028** sürümünün devamı olarak **1.1.0 / 1029** AAB'sinin nasıl
üretileceğini anlatır. Yeni uygulama oluşturulmaz; mevcut listeleme
güncellenir.

---

## 1. Neden EAS değil, GitHub Actions?

Orijinal talimatta EAS hesabı (`emergent009`, proje
`0cd40066-e675-4011-979a-6cc8b635e6fc`) geçiyordu. Depoda `eas.json` yok ve
o hesabın erişimi bu ortamdan doğrulanamıyor. Derlemenin, erişimi belirsiz
bir üçüncü taraf hesabına bağlı kalmaması için AAB doğrudan Gradle ile
GitHub Actions üzerinde üretiliyor.

Bunun tek şartı, geçerli yükleme anahtarının elinde olması — bkz. bölüm 2.

---

## 2. Yükleme anahtarı — SIFIRLANDI

> **Karar ve gerekçe.** Eski yükleme anahtarı Emergent'in Expo hesabındaydı
> ve erişilemiyordu. Play App Signing açık olduğu için **uygulama imzalama
> anahtarı Google'da duruyor** — yani mevcut kullanıcılar güncellemeleri
> almaya devam eder. Bu yüzden Play Console'dan yükleme anahtarı
> sıfırlandı ve yerel olarak yeni bir anahtar üretildi.

Geçerli yükleme sertifikası SHA-256:

```
14:FA:0B:17:E5:F6:E4:AE:E6:98:27:3B:C1:32:30:A4:2E:4C:85:7F:A0:C4:36:AE:34:6F:74:A5:1E:28:D9:97
```

Play 1028'i imzalayan eski anahtar (yalnızca tarihsel kayıt, artık
kullanılmıyor): `94:B7:FE:7C:...:95:43` — `CN=Zikirmatik: Zikirhane, O=Emergent`.

Keystore `upload.keystore` olarak kullanıcının bilgisayarında, repo dışında
duruyor. Repoya hiçbir anahtar girmez.

<details>
<summary>Eski durum: anahtarı bulmanın diğer yolları (artık gerekmiyor)</summary>

Play'deki 1028, `CN=Zikirmatik: Zikirhane, O=Emergent` sertifikasıyla
imzalanmış. SHA-256:

```
94:B7:FE:7C:45:1A:9E:17:D3:12:C8:08:F3:F2:BD:BA:9A:3F:17:03:36:72:17:C9:26:5F:64:6F:48:2D:95:43
```

Üç olasılık var:

**A. EAS hesabına erişimin var.** Anahtarı indir:

```
npx eas-cli login
npx eas-cli credentials --platform android
```

Menüden `Keystore: Download` seç. `.jks` dosyası, store parolası, anahtar
adı (alias) ve anahtar parolası verilir.

**B. Anahtar Emergent'te.** Onlardan yükleme keystore'unu ve üç parolayı
iste. Bu dosya olmadan aynı sertifikayla imzalanamaz.

**C. Anahtar kayıp.** Panik yok, uygulama kaybolmaz. Play App Signing
kullanıldığı için **uygulama imzalama anahtarı Google'da duruyor** —
mevcut kullanıcılar güncellemeyi almaya devam eder. Play Console →
Test ve yayınlama → Uygulama bütünlüğü → Uygulama imzalama →
**"Yükleme anahtarını sıfırla"** ile yeni bir yükleme anahtarı
kaydettirirsin. Bu durumda beklenen parmak izi değişir; iş akışını
çalıştırırken `expected_cert_sha256` alanına **yeni** parmak izini
yazman gerekir. Bunu bilerek yapmadığın sürece varsayılanı değiştirme —
iş akışı seni yanlış sertifikadan korumak için tasarlandı.

</details>

> **Anahtarı ve parolaları bana gönderme.** Onları yalnızca GitHub
> Secrets'a sen gireceksin; ben hiçbir aşamada görmüyorum ve depoya
> hiçbir anahtar yazılmıyor.

---

## 3. GitHub Secrets

`Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload.keystore` çıktısı |
| `ANDROID_KEYSTORE_PASSWORD` | store parolası |
| `ANDROID_KEY_ALIAS` | anahtar adı |
| `ANDROID_KEY_PASSWORD` | anahtar parolası |

Base64'e çevirme (Git Bash):

```
base64 -w0 /c/Users/limno/zikirmatik-anahtar/upload.keystore > /c/Users/limno/zikirmatik-anahtar/keystore.b64
```

Dosyanın içeriğini kopyalayıp secret'a yapıştır, sonra `keystore.b64`
dosyasını sil. `upload.keystore` dosyasını ve parolasını iki ayrı güvenli
yerde yedekle — kaybolursa sıfırlama sürecini baştan yaparsın.

`ANDROID_KEY_ALIAS` değeri: `upload`
`ANDROID_KEYSTORE_PASSWORD` ve `ANDROID_KEY_PASSWORD`: keystore üretirken
belirlediğin parola (PKCS12'de ikisi aynıdır).

---

## 4. AAB'yi üret

```
gh workflow run android-production-aab.yml --ref global-v1.1.0-redesign-v2
gh run watch
gh run download --name zikirmatik-production-aab --dir /c/Users/limno/Downloads
```

İş akışı sırayla şunları yapar: kalite kapıları (lint, typecheck, testler,
expo-doctor) → `expo prebuild` → keystore'u geçici dizine açar → release
imzasını bağlar → `bundleRelease` → **doğrulama** → artifact.

Reklamlar bu derlemede **üretim** modundadır (`EXPO_PUBLIC_ADS_MODE=production`).

---

## 5. Otomatik doğrulamalar

`frontend/scripts/verify-aab.js` üretilen AAB'yi denetler ve biri tutmazsa
iş akışı **durur, dosya yayınlanmaz**:

1. **İmza var mı** — `META-INF` içinde `.RSA/.DSA/.EC`. Yoksa imza
   yapılandırması bağlanmamıştır.
2. **Sertifika doğru mu** — SHA-256, Play'in beklediği yükleme
   anahtarıyla birebir aynı olmalı.
3. **16 KB sayfa hizası** — 64-bit `.so` dosyalarındaki tüm `PT_LOAD`
   segmentleri en az 16384'e hizalı olmalı (Play'in güncel zorunluluğu).
4. **Paket ve sürüm** — `applicationId = com.zikirhane.tesbih` ve
   `versionCode > 1028`. Bu değerler `app.json`'dan değil, **paketlenen**
   protobuf manifestinden okunur.

Doğrulayıcı, Play'den indirdiğin gerçek `1028.aab` üzerinde test edildi:
dört kontrolü de doğru raporladı (sertifika `94:B7:FE…`, 42 yerel
kütüphanenin tamamı 16 KB hizalı, `com.zikirhane.tesbih`, `1028`).

AAB'yi kendi bilgisayarında da denetleyebilirsin:

```
cd /c/Users/limno/Downloads/zikirmatik-global-worktree/frontend
node scripts/verify-aab.js /c/Users/limno/Downloads/Zikirmatik-1.1.0-1029.aab \
  --cert "14:FA:0B:17:E5:F6:E4:AE:E6:98:27:3B:C1:32:30:A4:2E:4C:85:7F:A0:C4:36:AE:34:6F:74:A5:1E:28:D9:97" \
  --min-version-code 1028
```

---

## 6. Play'e yükleme

İş akışı **Play'e yükleme yapmaz**; bu kasıtlı. Sırasıyla:

1. AAB'yi **İç test** kanalına yükle, kendi cihazında kur.
2. Şunları kontrol et: sayaçların ve hedeflerin **korunmuş** olmalı
   (1028'den güncelleme yapıyorsun, veri sıfırlanmamalı), uygulama adı
   cihaz dilinde, reklamlar üretim reklamı, UMP izin akışı çalışıyor.
3. Sorun yoksa Kapalı test → Üretim.

`versionCode 1029` yalnızca bir kez kullanılabilir. Yeni bir derleme
gerekirse `app.json` içinde 1030'a çıkar.

---

## 7. Yükleme öncesi kontrol listesi

- [ ] Play Console yükleme anahtarı sıfırlama talebi ONAYLANDI
- [ ] Sertifika parmak izi doğrulandı (iş akışı geçti)
- [ ] `versionCode 1029`, `versionName 1.1.0`
- [ ] İç testte 1028 üzerine güncelleme yapıldı, **veriler korundu**
- [ ] Üretim reklamları görünüyor, UMP izin ekranı açılıyor
- [ ] Uygulama adı cihaz dilinde çıkıyor
- [ ] `app-ads.txt` geliştirici sitesinin kökünde yayında
- [ ] Play listelemesi (açıklama, ekran görüntüleri) 27 dil için güncellendi
