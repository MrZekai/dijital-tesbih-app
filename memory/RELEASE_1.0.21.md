# Zikirmatik: Dijital Tesbih v1.0.21 — Cold-Start Only App Open

**versionName:** 1.0.21  
**source versionCode:** 1027  
**Önceki Play kapalı test artifact'i:** 1.0.20 (1025)

## Neden bu sürüm var?

Gerçek cihaz testinde cold-start App Open reklamı normal kapanırken, uygulama
background'a alınıp tekrar foreground'a getirildiğinde gösterilen ikinci App
Open reklamında bazı creative'lerde kapatma / "uygulamaya dön" arayüzünün
beklendiği gibi görünmediği gözlendi. Kullanıcı deneyimi ve release güvenliği
önceliklendirildi.

## Yeni App Open politikası

1. App Open yalnız gerçek process cold-start sırasında native splash/loading
   kapısı açıkken yüklenebilir ve gösterilebilir.
2. Ana içerik açıldıktan sonra App Open gösterilmez.
3. Background -> foreground dönüşlerinde App Open gösterilmez.
4. Cold-start reklamı kapandıktan sonra yeni App Open preload edilmez.
5. Cold-start yükleme fırsatı 3 saniye içinde sonuçlanmazsa uygulama açılır;
   geç gelen reklam çöpe atılır.
6. Banner reklamlar sekme ekranlarında oturum boyunca çalışmaya devam eder; bu nedenle reklam geliri App Open ile tek gösterime düşmez. AdMob banner automatic refresh ayarı açıksa banner yeni reklam istekleri üretmeye devam eder.
7. Interstitial reklam için gerçek bir AdMob interstitial unit ID bulunmadığından özellik kapalı kalır; sahte/test ID ile production davranışı oluşturulmaz.
8. UMP / consent güvenlik akışı v1.0.20 hardening'i aynen korunur.

## Emergent build kuralı

GitHub `main` kaynak otoritesidir. Emergent eski workspace/memory kullanmamalı;
`frontend/app.json` içindeki **1.0.21 / 1027** tabanını esas almalıdır. Emergent
Publish native artifact versionCode'unu artırırsa bu kabul edilebilir; final AAB
mutlaka **1025'ten büyük** olmalı ve eski release ile aynı upload key ile
imzalanmalıdır.
