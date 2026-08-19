# Android Versioning — Güncel Kaynak Otoritesi

## Play Console'da son yayınlanan kapalı test
- Kanal: **Kapalı test - Alpha**
- versionName: **1.0.19**
- versionCode: **1023**
- Son güncelleme: **19 Ağustos 2026**

## Sıradaki release
- versionName: **1.0.20**
- versionCode: **1024**
- package/applicationId: **com.zikirhane.tesbih**

> Android/Google Play kuralı: yeni AAB'nin `versionCode` değeri daha önce
> yüklenen 1023'ten büyük olmalıdır. Bu projede sıradaki değer 1024'tür.

## Kaynak otoritesi
- Sürüm değerleri yalnız `frontend/app.json` içinden değiştirilmelidir.
- `frontend/package.json` sürümü insan-okunur proje metadata'sı olarak aynı
  `1.0.20` değerinde tutulur.
- Emergent/CI build sırasında `app.json` değerlerini eski hafıza veya cached
  workspace ile override ETMEMELİDİR.
- Build sonunda gerçek AAB/APK manifestinden versionName/versionCode tekrar
  doğrulanmalıdır.
