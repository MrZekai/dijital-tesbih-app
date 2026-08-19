# Android Versioning — Güncel Kaynak Otoritesi

## Play Console'daki son kapalı test artifact'i
- Kanal: **Kapalı test - Alpha**
- versionName: **1.0.20**
- versionCode: **1025**
- Yükleme: **19–20 Ağustos 2026**

## Yerel test APK bilgisi
- versionName: **1.0.20**
- versionCode: **1026**
- Not: Emergent Publish, AAB ve APK native build'lerinde kaynak versionCode'u
  ayrı ayrı artırabildi. Bu nedenle artifact manifesti her build sonunda ayrıca
  doğrulanmalıdır.

## Sıradaki release kaynağı
- versionName: **1.0.21**
- source versionCode: **1027**
- package/applicationId: **com.zikirhane.tesbih**

> Google Play için yeni AAB'nin gerçek native `versionCode` değeri daha önce
> yüklenen 1025'ten büyük olmalıdır. Kaynakta 1027 kullanılması, Emergent
> auto-increment uygulasa da uygulamasa da güvenli bir taban sağlar.

## Kaynak otoritesi
- Sürüm değerleri `frontend/app.json` içinden yönetilir.
- `frontend/package.json` insan-okunur sürüm metadata'sı olarak `1.0.21`
  değerinde tutulur.
- Emergent/CI eski memory veya cached workspace değerlerini kaynak sürümün
  üzerine yazmamalıdır.
- Build sonunda AAB ve APK'nın gerçek manifestinden versionName/versionCode
  tekrar doğrulanmalıdır.
