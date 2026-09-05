# RELEASE_COMPATIBILITY_CHECKLIST.md — v1.1.0 / 1029

## A. Değişmeyenler (doğrulandı)

- [x] `applicationId` = `com.zikirhane.tesbih`
- [x] AdMob App ID = `ca-app-pub-1380972808968213~2930057843`
- [x] Üretim banner = `ca-app-pub-1380972808968213/1326176029`
- [x] Üretim App Open = `ca-app-pub-1380972808968213/1789210450`
- [x] Kalıcı veri anahtarı = `zikirhane:v1`, diske yazılan `version` = `1`
- [x] Yeni keystore YOK, imzalama dosyası repoda YOK
- [x] `.gitignore`: `*.aab`, `*.apk`, `*.keystore`, `*.jks` hariç tutuluyor

## B. Sürüm

- [x] `versionCode` = **1029** (Play'deki 1028'den büyük)
- [x] `versionName` = **1.1.0**
- [ ] EAS uzak sürüm sayacı 1029'dan büyük bir değer isterse ONU kullan

## C. Sende çalıştırılacak komutlar

```bash
git fetch origin
git checkout global-v1.1.0
cd frontend
yarn install --frozen-lockfile
yarn lint && yarn typecheck && yarn test
npx expo-doctor                      # bu ortamda ağ nedeniyle çalıştırılamadı

# 1) Önce TEST APK (test reklamlarıyla)
EXPO_PUBLIC_ADS_MODE=test eas build -p android --profile preview

# 2) QA sonrası ÜRETİM AAB (EXPO_PUBLIC_ADS_MODE TANIMSIZ olmalı)
eas build -p android --profile production
```

## D. Üretim AAB üretildikten sonra ZORUNLU kontrol

```bash
unzip -p app.aab META-INF/*.RSA > upload.der
keytool -printcert -file upload.der
```

Beklenen SHA-256 **birebir** şu olmalı:

```
94:B7:FE:7C:45:1A:9E:17:D3:12:C8:08:F3:F2:BD:BA:9A:3F:17:03:36:72:17:C9:26:5F:64:6F:48:2D:95:43
Owner: CN=Zikirmatik: Zikirhane, O=Emergent
```

Farklıysa **Play'e yükleme**. (Play'den indireceğin APK'nın parmak izi
`E9:96:20:…` olacaktır — bu Google'ın app-signing anahtarıdır, normaldir.)

## E. Cihazda yapılacak QA (bu ortamda BLOCKED)

- [ ] Temiz kurulum → açılış crash yok
- [ ] **1028 üzerine güncelleme** → sayaçlar, özel zikirler, geçmiş, hedefler KORUNDU
- [ ] 10× soğuk açılış
- [ ] Arka plan → 60 sn+ → ön plan (App Open gösterimi)
- [ ] Arka plan → 5 sn → ön plan (App Open GÖSTERİLMEMELİ)
- [ ] Dil değişimi: en → tr → ar (RTL) → yeniden başlat → geri en
- [ ] Arapça'da tüm ekranlar, modal'lar ve reklam alanı düzgün
- [ ] Sayaca hızlı 100 dokunuş → kayıp yok, çökme yok
- [ ] Monkey 1.000 sonra 10.000 event
- [ ] `adb logcat` FATAL/ANR yok
- [ ] UMP consent formu (EEA/UK cihaz veya VPN)
- [ ] Yedek al → dosya oluşuyor ve paylaşılabiliyor

## F. Play Console öncesi

- [ ] `app-ads.txt` geliştirici sitesinin kökünde yayında ve 200 dönüyor
      (bkz. `APP_ADS_TXT_SETUP.md`)
- [ ] Store listing: varsayılan dil İngilizce, Türkçe yerelleştirme
      "Zikirmatik: Dijital Tesbih" olarak korunuyor
- [ ] Data safety formu güncel
- [ ] Internal testing → closed testing → production (doğrudan production'a ÇIKMA)
