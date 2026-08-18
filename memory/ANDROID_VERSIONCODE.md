# Zikirmatik — Android versionCode Source-of-Truth

## Amaç
Bir zamanlar Emergent build pipeline'ı `versionCode` değerini otomatik
timestamp/build-index temelli olarak üretiyor, `app.json` içinde tanımlı
`android.versionCode` bu değeri override etmiyordu. Sonuç: son yayınlanan
APK'nın manifest'inde `versionCode=1018` göründü; oysa `app.json`'da 132
yazılıydı. Bu tutarsızlık, Play Console upload akışını riske sokabileceği
için tek otoriter kaynak `app.json` seçildi.

## Karar
- **Otoriter kaynak**: `frontend/app.json` altındaki
  `expo.android.versionCode` alanı.
- **Şu anki değer**: `1020` (v1.0.17 — reklam yayın sürümü; bir önceki
  kapalı test sürümü 1019'du).
- **Sonraki üretim binary'sinde beklenen manifest değeri**: `1020`.
  (Doğrulandı: `npx expo prebuild` çıktısında
  `android/app/build.gradle` → `versionCode 1020`, `versionName "1.0.17"`.)
- **In-app "Sürüm" satırında görünen değer**: `1.0.17 (1020)` —
  `expo-application` native paketten okunur (`BUG-012`), yani cihazdaki
  APK ile birebir eşleşir.
- **AndroidManifest.xml içine gömülecek `android:versionCode`**: `1020`
  (Expo prebuild `app.json`'dan üretecek).

## Emergent build pipeline talimatı
Deploy sekmesinde build üretilirken pipeline'ın `app.json`'daki
`android.versionCode` değerini **override etmemesi** gerekir. EAS
`remote versioning` benzeri bir mekanizma varsa **kapalı** olmalıdır.
Emergent'e ait build yapılandırmasında bu değer LOCAL kaynak olarak
kullanılmalı; her yeni yüklemeden önce `app.json` içindeki değer manuel
olarak bir arttırılır (örn. 1020 → 1021 → 1022 …).

## Play Console gereksinimi
Play Store, aynı sürüm izinde daha büyük `versionCode` bekler. Bu
projede en yüksek yüklenmiş `versionCode` **1019**'dur; bu nedenle
`1020` sonraki geçerli değerdir.

## versionName
- `versionName` `1.0.17`'ye yükseltildi — bu sürümde reklam yayını
  (banner + uygulama açılışı) etkinleştirildi ve kullanıcı tarafından
  bildirilen hatalar giderildi.
- Bir sonraki featureset veya store yayını için `versionName` normal
  semver ile artırılmalıdır (örn. `1.0.18`).

## Değişiklik yapıldığında
- `versionCode`'u sadece **`frontend/app.json`** içinden değiştir.
- Emergent Publish'te build alırken CI/Pipeline'ın `app.json`'ı
  override etmediğinden emin ol; bu doğrulama, build tamamlandıktan
  sonra APK'nın `AndroidManifest.xml` içindeki `android:versionCode`
  değerine bakılarak yapılabilir.
