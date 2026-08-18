# Hedef Zikirmatik v1.0.17 — Reklam Yayın Sürümü + Hata Giderme

**versionName:** 1.0.17 · **versionCode:** 1020
**Önceki sürüm:** 1.0.16 (1019, kapalı test — reklamlar tamamen kapalıydı)

---

## 1. AdMob reklam entegrasyonu (açıldı)

### Kimlikler

| Alan | Değer |
|---|---|
| Uygulama Kimliği (Android) | `ca-app-pub-1380972808968213~2930057843` |
| Banner reklam birimi | `ca-app-pub-1380972808968213/1326176029` |
| Uygulama Açılışı reklam birimi | `ca-app-pub-1380972808968213/1789210450` |

Uygulama kimliği `app.json` → `plugins > react-native-google-mobile-ads >
androidAppId` alanındadır. `expo prebuild` çıktısında
`AndroidManifest.xml` içinde şu şekilde doğrulandı:

```xml
<meta-data
  android:name="com.google.android.gms.ads.APPLICATION_ID"
  android:value="ca-app-pub-1380972808968213~2930057843"
  tools:replace="android:value"/>
```

### Yapılan değişiklikler

**`src/ads/adConfig.ts`**

- `ADS_ENABLED` `false` → **`true`** (ana anahtar).
- **Kritik hata:** Gerçek reklam kimlikleri yalnızca
  `EXPO_PUBLIC_AD_MODE=production` ortam değişkeni tanımlıyken
  kullanılıyordu; ancak depoda `.env` dosyası YOK. Yani ana anahtar
  açılsa bile yayın build'i sessizce **Google'ın TEST reklamlarını**
  gösterecekti (gelir = 0). Artık test/prod ayrımı tamamen kaldırıldı:
  gerçek birim kimlikleri kod içinde sabittir, `.env` gerekmez
  (ayrıntı: bölüm 1b).
- App Open zamanlama sabitleri eklendi: soğuk açılış penceresi (8 sn),
  bekleme süresi (4 dk), önbellek geçerliliği (4 saat — Google sınırı).

**`app.json`**

- `com.google.android.gms.permission.AD_ID` **engellenen izinler
  listesinden çıkarıldı ve verilen izinlere eklendi.** Önceki sürümde bu
  izin `blockedPermissions` içindeydi; bu izin olmadan AdMob reklam
  kimliğine erişemez, kişiselleştirilmiş reklam sunulamaz ve doldurma
  oranı (fill rate) ciddi biçimde düşer. Aynı şekilde
  `ACCESS_ADSERVICES_*` engellemeleri de kaldırıldı (Privacy Sandbox).
- `INTERNET` ve `ACCESS_NETWORK_STATE` izinleri açıkça beyan edildi.
- `version` 1.0.17, `versionCode` 1020.

**`src/ads/useAppOpenAd.ts` (baştan yazıldı)**

Kullanıcının "uygulama açılınca reklam çıkmıyor" bildiriminin kök nedeni:
`lastShown` değişkeni `Date.now()` ile başlatıldığı için **soğuk açılışta
reklam 4 dakika boyunca bilerek atlanıyordu.** Ek olarak:

- Reklam yüklendiğinde (`LOADED`) gösterim hiç denenmiyordu.
- Aynı anda iki `load()` çakışabiliyordu.
- Reklamın 4 saatlik önbellek geçerliliği kontrol edilmiyordu.

Yeni davranış:

1. Açılışta reklam yüklenir; 8 saniyelik pencere içinde yüklenirse
   **hemen gösterilir**.
2. Uygulama arka plandan öne geldiğinde, 4 dk bekleme dolduysa gösterilir.
3. Reklam kapanınca tam olarak **bir kez** yeniden yüklenir.
4. 4 saatten eski önbellek geçersiz sayılır.
5. `isShowing` kilidi ile çift gösterim engellenir.

**`src/ads/AdsProvider.tsx`**

- **Hata:** UMP onayı alınamadığında (ağ yok, form kapatıldı) `initialize()`
  hiç çağrılmıyordu ve `canRequestAds` uygulama ömrü boyunca `false`
  kalıyordu → **hiç reklam gösterilmiyordu.** Artık onay bilgisi
  okunamazsa (AB dışında UMP zaten sessizce geçer) reklam isteği
  engellenmiyor ve SDK bir kez initialize ediliyor.
- Uygulama öne geldiğinde ve hâlâ izin alınamamışsa tek seferlik yeniden
  deneme.
- `maxAdContentRating: G` — ibadet uygulaması için uygun içerik derecesi.
- **AdMob/UMP politikası:** onay veren kullanıcı tercihini
  değiştirebilmeli. Ayarlar > Uygulama bölümüne "Reklam Gizlilik
  Seçenekleri" satırı eklendi (yalnızca UMP gerekli dediğinde görünür).

**Geçiş reklamı (interstitial) — bilinçli olarak kapatıldı**

AdMob panelinde bu uygulama için geçiş reklamı birimi oluşturulmamış ve
test kimlikleri de kod tabanından silindi. Gösterilebilecek geçerli bir
birim olmadığı için özellik **tamamen kapalıdır**
(`interstitialEnabled = false`). Altyapı kodda duruyor — AdMob'da birim
oluşturup kimliği `adConfig.ts` içine yazdığınızda devreye girer.

**iOS notu:** Yalnızca Android uygulama kimliği ve birimleri verildi.
Test kimlikleri silindiği için iOS'ta reklam altyapısı tamamen pasiftir.
iOS yayını planlanıyorsa AdMob'da ayrı bir iOS uygulaması ve birimleri
oluşturulmalıdır.

### Banner yerleşimi ve politika uyumu

- Banner `ANCHORED_ADAPTIVE_BANNER` boyutunda, sekme çubuğunun hemen
  üstünde **sabit** duruyor (ayrıntı: bölüm 1b).
- Üzerinde "REKLAM" etiketi var (Google'ın önerdiği ayrım).
- Ana Sayfa'daki kontrol düğmeleri ile banner arasına güvenli boşluk
  eklendi — yanlışlıkla tıklama (geçersiz trafik) riski azaltıldı.
- Reklam yüklenemezse (no-fill) **alan korunur**, düzen zıplamaz.

---

## 1b. Test reklam kodları kaldırıldı + reklam alanı sabitlendi (revizyon)

### Test kimlikleri tamamen silindi

`TEST_BANNER_*`, `TEST_INTERSTITIAL_*`, `TEST_APP_OPEN_*` sabitlerinin
tamamı `adConfig.ts` dosyasından **silindi**. `app.json` içindeki
`iosAppId` de bir Google örnek kimliğiydi — o da kaldırıldı. Kod
tabanında artık tek bir test reklam kimliği bile yok; her ortamda
(geliştirme dahil) yalnızca gerçek birimler kullanılır.

**Kendi reklamınıza tıklama riski:** Test birimleri olmadığı için
geliştirme cihazında da gerçek reklam görünür. Google'ın bunun için
önerdiği güvenli yol, sahte birim değil **test cihazı tanımlamaktır** —
gerçek birimi kullanır, sadece o cihaza test reklamı sunar. Bunun için
`.env` desteği eklendi:

```
EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS=CIHAZ_KIMLIGI_1,CIHAZ_KIMLIGI_2
```

Cihaz kimliğini uygulamayı çalıştırıp logcat'te
`setTestDeviceIds(...)` satırında bulabilirsiniz. **Yayın build'inde bu
değişken boş olmalıdır** (dolu olursa konsola uyarı basılır).

### iOS'ta reklam kapalı

AdMob panelinde yalnızca Android uygulaması ve birimleri var. Test
kimlikleri de silindiği için iOS'ta gösterilecek geçerli bir birim
kalmadı; `adsEnabled` artık `Platform.OS === "android"` koşulunu da
içeriyor. iOS yayını yapılacaksa AdMob'da iOS uygulaması + birimleri
oluşturulup `adConfig.ts` ve `app.json` güncellenmelidir.

### Reklam alanı: sabit, ayrılmış ve her zaman görünür

**Sorun:** Banner; Zikirlerim, İstatistikler ve Ayarlar ekranlarında
`ScrollView`'ın **en sonundaydı**. Kullanıcı sayfayı sonuna kadar
kaydırmadıkça reklamı hiç görmüyordu. Ayrıca reklam yüklenemediğinde
alan 0 yüksekliğe daraltılıyor, düzen zıplıyordu. Dört sekmenin her
birinde ayrı banner olduğu için arka planda kalan (görünmeyen) sekmeler
de reklam isteyip gösterim kaydediyordu — bu AdMob'da **"görünmeyen
gösterim"** ihlalidir.

**Çözüm:**

- Sekme ekranlarındaki dört ayrı banner kaldırıldı; yerine
  `app/(tabs)/_layout.tsx` içinde **sekme çubuğunun hemen üstüne
  sabitlenmiş TEK banner** kondu. Dört sekmenin tamamında aynı yerde,
  kaydırmadan bağımsız olarak görünür.
- Alan yüksekliği `BANNER_SLOT_HEIGHT = 62dp` ile **sabittir**. Reklam
  gelmese de, onay beklenirken de, no-fill durumunda da alan korunur —
  düzen asla zıplamaz. Alanın üstünde "REKLAM" etiketi vardır.
- Banner yalnızca bir sekme rotası ekrandayken mount edilir. Tesbihat /
  Esmaül Hüsna / Özel Zikir ekranı açıldığında unmount edilir →
  görünmeyen gösterim oluşmaz.
- **Esmaül Hüsna** ekranına da ekranın altına sabitlenmiş kendi banner'ı
  eklendi (liste kaydırılsa da görünür kalır; detay sayfası açıkken
  gizlenir).
- **Tesbihat ve Özel Zikir ekranlarında banner YOKTUR** — bu bilinçli bir
  karardır. Tesbihat ekranının tamamı dokunma alanıdır; hızlı zikir
  sırasında alt kenardaki bir reklama yanlışlıkla dokunma olasılığı
  yüksektir ve bu AdMob'da "geçersiz trafik" sayılıp hesabın askıya
  alınmasına yol açabilir.
- Ortak `src/lib/layout.ts` eklendi: sekme çubuğu + reklam alanı
  yüksekliği tek kaynaktan hesaplanır. Eskiden her ekran farklı sabit
  sayılar (100, 120, 78…) kullanıyordu; artık tutarlı.
- Ana Sayfa'da kontrol düğmelerinin yüksekliği `onLayout` ile ölçülüyor
  ve sayaç halkasının alt boşluğu buna göre hesaplanıyor — Sade Mod'da,
  Büyük Yazı Modu'nda ve farklı ekran boylarında halka ile düğmeler
  çakışmıyor.

---

## 2. Ana sayfadaki "güneş" düğmesi (düzeltildi)

Ses düğmesinin yanındaki güneş simgesi **"Ekranı Açık Tut"** işlevidir:
açıkken zikir çekerken telefon ekranı sönmez.

**Sorun:** Düğmede etiket yoktu, basınca hiçbir görsel/dokunsal geri
bildirim gelmiyordu ve aktif durum yalnızca çok soluk bir ikon rengi
farkıyla gösteriliyordu. Kullanıcı düğmenin çalışmadığını düşünüyordu.

**Yapılanlar:**

- Dört düğmenin de altına Türkçe etiket eklendi: **Titreşim · Ses ·
  Ekran · Tesbihat**.
- Basınca titreşim + basılı görünüm (küçülme/soluklaşma) geri bildirimi.
- Aktif durum artık altın kenarlık + koyu zümrüt dolgu ile net.
- Basınca ne olduğunu söyleyen kısa bilgi baloncuğu
  ("Ekran açık kalacak (zikir sırasında sönmez)" / "Ekran normal
  süresinde sönecek").
- Erişilebilirlik etiketleri (`accessibilityLabel`, `accessibilityState`).
- **Ek düzeltme:** "Ekranı Açık Tut" ayarı yalnızca Ana Sayfa'da
  işliyordu; 99'luk Namaz Sonrası Tesbihat sırasında ekran sönüyordu.
  Artık tesbihat ekranında da geçerli.

---

## 3. Büyük Yazı Modu (gerçekten çalışır hale getirildi)

**Sorun:** `settings.bigText` değeri TÜM uygulamada tek bir yerde
kullanılıyordu — Ana Sayfa sayacının font boyutu (128 → 152). Sayaç
zaten `adjustsFontSizeToFit` ile halkaya sığacak şekilde küçültüldüğü
için pratikte **hiçbir görsel değişiklik olmuyordu.**

**Çözüm:**

- `src/lib/fontScale.tsx` — hafif bir Context ile uygulama geneli
  `fontScale` (Büyük Yazı açıkken **×1.22**).
- `src/components/AppText.tsx` — `Text` ve `TextInput` için birebir
  uyumlu sarmalayıcılar; stildeki `fontSize` ve `lineHeight` değerlerini
  ölçekler. Stilsiz metinler için RN varsayılanı (14) baz alınır.
- Tüm ekranlar bu sarmalayıcıları kullanacak şekilde güncellendi
  (Ana Sayfa, Zikirlerim, İstatistikler, Ayarlar, Tesbihat, Esmaül
  Hüsna, Özel Zikir, Karşılama, ConfirmSheet).
- Sekme çubuğu etiketleri ve yüksekliği de ölçekle uyumlu.
- Ayarlar'a açıklama ("Uygulamadaki tüm yazıları daha büyük ve okunaklı
  gösterir") ve **canlı önizleme kutusu** eklendi — anahtarı çevirince
  fark anında görülüyor.

**Performans:** Ölçek context'i yalnızca bir sayı taşır ve sadece
kullanıcı ayarı değiştirdiğinde güncellenir. Ana store (her zikir
dokunuşunda değişir) doğrudan tüketilmez; bu sayede sayaç artışları
binlerce `Text` bileşenini yeniden render etmez.

---

## 4. Diğer bulunan ve giderilen sorunlar

| # | Sorun | Çözüm |
|---|---|---|
| 1 | **Tesbihat'ta aşama atlama riski.** Yan etkiler (`setStepIdx`, `setDone`, titreşim) `setCount` güncelleyicisinin İÇİNDE çağrılıyordu. React 18+ güncelleyicileri iki kez çalıştırabildiği için 33'te Elhamdülillah atlanıp doğrudan Allahu Ekber'e geçilebiliyor ve titreşim çiftleniyordu. | Tüm karar mantığı güncelleyici dışına, saf biçimde taşındı. Regresyon testi eklendi (99 dokunuş = 99 sayım, 3 aşama). |
| 2 | **Tesbihat'ta tesbih tanesi sesi hiç çalmıyordu** (Ana Sayfa'da çalıyordu). | `useTesbihSounds` tesbihat ekranına eklendi; Ayarlar'daki ses tercihine uyar. |
| 3 | **Bildirim başlığı "Zikirhane"** — uygulama adı "Hedef Zikirmatik". | Başlık düzeltildi. |
| 4 | **İstatistikler > "Tümünü Sıfırla"** bir `<Text onPress>` idi; dokunma alanı yalnızca yazının kendisiydi, basılı geri bildirimi yoktu. | Tam `Pressable` + erişilebilirlik etiketi. |
| 5 | **Banner genişliği ekran döndürme/katlanabilir cihazlarda bozuluyordu** — `Dimensions.get()` modül yüklenirken bir kez okunuyordu. | `useWindowDimensions()` ile canlı değer. |
| 6 | Ana Sayfa kontrol düğmeleri banner'a yapışıktı (yanlış tıklama riski). | Güvenli boşluk eklendi, sayaç halkası alt boşluğu buna göre ayarlandı. |

---

## 5. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ 0 hata |
| `npx eslint app src` | ✅ 0 hata, 0 uyarı |
| `npx expo export --platform android` | ✅ Paketleme başarılı (4.74 MB Hermes bundle) |
| `npx expo prebuild --platform android` | ✅ Manifest doğru: AdMob App ID, `AD_ID` izni, `versionCode 1020`, `versionName 1.0.17`, `allowBackup=false` |
| `node tests/multiTouchCounting.test.js` | ✅ Tüm testler geçti |
| `node tests/v1017Fixes.test.js` (yeni) | ✅ Tüm testler geçti |

---

## 6. Yayın öncesi yapılacaklar (sizin tarafınızda)

1. **Test cihazı tanımlayın.** Kendi cihazınızda gerçek reklamlara
   tıklamak AdMob hesabınızın askıya alınmasına yol açar. AdMob panelinde
   *Ayarlar > Test cihazları* bölümünden cihazınızın reklam kimliğini
   ekleyin (veya cihazda dev build kullanın — dev build zaten test
   reklamı gösterir).
2. **app-ads.txt** dosyasını yayıncı sitenize koyun
   (`https://sites.google.com/view/hedefzikirmatik/` altında
   `app-ads.txt` barındırmak Google Sites'ta mümkün değildir; kendi
   alan adınız varsa oraya koyun). Zorunlu değil ama doldurma oranını
   ve geliri artırır.
3. **Play Console > Uygulama içeriği > Reklamlar** bölümünde
   "Uygulamamda reklam var" seçeneğini işaretleyin.
4. **Veri güvenliği formunu** güncelleyin: AdMob reklam kimliği (AAID)
   toplandığı için "Uygulama etkinliği / Cihaz kimlikleri" beyanı
   gerekir.
5. İlk yayından sonra reklamların dolması 1-2 saat sürebilir; yeni
   reklam birimlerinde ilk gün doldurma oranı düşüktür — bu normaldir.
6. İsterseniz AdMob'da bir **geçiş reklamı** birimi oluşturup kimliğini
   `adConfig.ts` içindeki `androidInter` sabitine ekleyin; altyapı hazır.
