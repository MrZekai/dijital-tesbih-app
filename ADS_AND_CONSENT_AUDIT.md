# ADS_AND_CONSENT_AUDIT.md

## Reklam envanteri (koddan çıkarıldı ve 1028 paketinde doğrulandı)

| Tür | Kimlik | Durum |
|---|---|---|
| AdMob Application ID (Android) | `ca-app-pub-1380972808968213~2930057843` | Aktif — `app.json` + `adConfig.ts` |
| Banner | `ca-app-pub-1380972808968213/1326176029` | Aktif — sekme çubuğunun üstünde sabit alan |
| App Open | `ca-app-pub-1380972808968213/1789210450` | Aktif — cold-start + resume |
| Interstitial | *(yok)* | **Kapalı** — AdMob'da birim oluşturulmamış |
| Rewarded | *(yok)* | Kullanılmıyor |
| iOS birimleri | *(yok)* | Reklamlar yalnızca Android'de etkin |

Her ikisi de `1028.apk` içindeki `assets/index.android.bundle` dosyasında
birebir bulundu. Yayıncı kimliği `pub-1380972808968213`, `app-ads.txt`
satırıyla tutarlıdır.

## v1.1.0 değişikliği — test / üretim ayrımı

Önceki sürümde **her ortamda gerçek reklam birimleri** kullanılıyordu; bu,
geliştirme cihazında kendi reklamına tıklama → "geçersiz trafik" riski
demekti. Artık:

```
isProductionAds = EXPO_PUBLIC_ADS_MODE==="production" ? true
                : EXPO_PUBLIC_ADS_MODE==="test"       ? false
                : !__DEV__
```

- **Geliştirme / QA** → Google'ın resmî örnek birimleri
  (`ca-app-pub-3940256099942544/…`) ve konsola açık bir uyarı.
- **Production release** → yalnızca gerçek birimler.
- `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` mekanizması korundu.

**Yayın kuralı:** production build'inde `EXPO_PUBLIC_ADS_MODE` tanımsız olmalı.

## Korunan politika güvenceleri (dokunulmadı)

| Koruma | Uygulanışı |
|---|---|
| UMP fail-closed | `getConsentInfo()` okunamıyorsa reklam izni **varsayılmaz** |
| Consent olmadan reklam isteği yok | `canRequestAds` false iken SDK initialize bile edilmez |
| Gizlilik seçenekleri | UMP "REQUIRED" derse Ayarlar'da satır görünür |
| Cold-start App Open | Yalnız splash kapısı açıkken; en fazla 3 sn bekler; kullanıcı ekrana dokunduysa **iptal** |
| Resume App Open | En az **60 sn** arka planda kalma + en az **15 dk** gösterim aralığı + reklam ÖNCEDEN yüklü olmalı |
| Reklamın kendi lifecycle'ı | OPENED/CLOSED/CLICKED AppState geçişleri yeni fırsat sayılmaz |
| CLICKED sonrası | Bir sonraki resume bastırılır |
| Üst üste tam ekran yok | `isShowingRef` + `fullScreenAdActive` |
| App Open sırasında banner | Native view unmount edilir, alan korunur (düzen zıplamaz) |
| Son gösterim zamanı | `@zikirhane/app-open-last-shown-v1` (process yeniden başlasa da geçerli) |
| Cache yaşı | 4 saat üstü reklam atılır |
| Görünmeyen gösterim yok | Banner yalnız sekme rotalarında mount edilir |
| Yanlış tıklama önlemi | Kontroller banner'a yapışık değil; sayaç dokunuşunda reklam yok |
| Reklam hatası ≠ çökme | `AdBoundary` + her yolda try/catch; reklam yüklenmese de uygulama çalışır |
| Reklam/içerik ayrımı | Sabit yükseklikli alan + üstünde "REKLAM" etiketi (artık 27 dilde) |
