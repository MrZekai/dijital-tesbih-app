# Google Play veri güvenliği incelemesi

14 Kasım 2026. Android paket adı `com.zikirhane.tesbih`. Bu kayıt mağaza sahibinin Play Console beyanını güncellemesi için teknik girdidir.

## Sürüm ve kanıt

- `frontend/package.json` ve `frontend/yarn.lock` reklam köprüsünü `react-native-google-mobile-ads@16.0.3` olarak sabitliyor. Köprünün bu sürümdeki Android tanımları Google Mobile Ads 24.9.0 ve User Messaging Platform (UMP) 4.0.0 kullanıyor. Aday sürümün çözümlenmiş Gradle bağımlılıklarını doğrulamak için Android proje klasöründe `gradlew.bat :app:dependencies --configuration releaseRuntimeClasspath` çıktısını kontrol edin. [Köprünün sabit sürümü](https://github.com/invertase/react-native-google-mobile-ads/blob/v16.0.3/package.json) · [Google sürüm notları](https://developers.google.com/admob/android/rel-notes)
- Mevcut arşivden okunan `Zikirmatik-1.1.1-1030.aab` dosyasının SHA-256 özeti `7bcf0d732eba1d1b09740cafca3bf8a462d547239d2a50118b13e1db361c9601`. Paketin kendi `base/manifest/AndroidManifest.xml` kaydı sürüm 1030, min SDK 24 ve hedef SDK 36 gösteriyor. Aday paket üretildiğinde aynı karşılaştırmayı aday AAB üzerinde tekrarlayın: `bundletool dump manifest --bundle=<aday.aab> --module=base`.
- Sürüm 1030'un birleşmiş manifestinde INTERNET, ACCESS_NETWORK_STATE, AD_ID, ACCESS_ADSERVICES_AD_ID, ACCESS_ADSERVICES_ATTRIBUTION ve ACCESS_ADSERVICES_TOPICS var. ACCESS_FINE_LOCATION ve ACCESS_COARSE_LOCATION yok. Yaklaşık konum IP adresinden çıkarılabildiği için bu iki iznin yokluğu yaklaşık konum beyanını ortadan kaldırmaz. `allowBackup=false` ve `DELAY_APP_MEASUREMENT_INIT=true` değerleri mevcut.
- Aynı manifestte bildirim, açılışta yeniden zamanlama, titreşim, ses ayarları, uyanık tutma, C2DM alımı, biyometri/parmak izi ve yükleme yönlendirmesi izinleri de var. Bir bağımlılığın eklediği izin tek başına veri aktarımı kanıtı oluşturmaz.

## Beyan için veri akışları

Google'ın güncel GMA açıklaması **25.5.0** için hazırlanmış. Aşağıdakiler 24.9.0 incelemesinde başlangıç kategorileridir. Mağaza sahibi seçili reklam ortakları, gerçek bölgeler ve yapılandırmayla her satırı eşleştirmelidir. Google SDK için genel amaçları reklam, analiz ve sahtekârlığı önleme olarak listeler. [Google Mobile Ads veri açıklaması](https://developers.google.com/admob/android/privacy/play-data-disclosure)

| Akış | Toplanan / paylaşılan veri adayı | Amaç ve beyan kararı |
| --- | --- | --- |
| Google Mobile Ads reklam isteği | IP adresinden yaklaşık konum | Google otomatik toplama ve paylaşma bildiriyor. Reklam, analiz ve sahtekârlığı önleme seçeneklerini yapılandırmayla doğrulayın. Hassas konuma erişen bir uygulama kod yolu belirlenmedi. |
| Google Mobile Ads ölçümü | Uygulama etkileşimleri ve reklam etkileşimleri | Google'ın bildirdiği açılış, dokunma ve izleme örneklerini Play Console’daki uygulama etkinliği kategorisiyle eşleyin. |
| Google Mobile Ads tanılama | Performans ve tanılama bilgileri | Başlatma süresi, donma ve enerji tüketimi gibi örnekleri tanılama altında inceleyin. Ayrı bir uygulama çökme raporlama entegrasyonu saptanmadı. |
| Google Mobile Ads kimlikleri | Reklam kimliği, uygulama grubu kimliği ve uygulanabilir diğer tanımlayıcılar | Cihaz veya diğer kimlikler altında değerlendirin. SDK yapılandırması ve cihaz ayarları kullanılabilen kimlikleri etkiler. |
| UMP | Reklam isteğine uygunluk ve gizlilik tercihleri | `AdsProvider.tsx` açılışta UMP durumunu günceller, gerekirse formu gösterir ve `canRequestAds` sonrasında GMA'yı başlatır. Bu işaret kişiselleştirilmiş reklama onay anlamına gelmez. Gerekli bölgelerde Ayarlar'dan gizlilik seçeneklerine erişim sunulur. UMP ve reklam ortaklarının veri işleme şartlarını mağaza sahibi ayrıca incelemelidir. [Google UMP](https://developers.google.com/admob/android/privacy) |
| Sayaç, hedef, zikir adı ve geçmiş | Cihaz içindeki uygulama deposu | Bu işlevlerde sunucuya gönderim tespit edilmedi. Kullanıcının açıkça başlattığı yedek dışa aktarımında seçtiği alıcıya kayıtlar gidebilir. Kullanıcı başlatmalı paylaşım istisnasını gerçek akışa göre inceleyin. [Play tanımları](https://support.google.com/googleplay/android-developer/answer/10787469) |
| Günlük hatırlatıcı | Yerel bildirim zamanı ve tercihi | `frontend/src/lib/notifications.ts` cihazda bildirim planlar. Bu akışta uzak push token kaydı bulunmadı. |

Google, kendi reklam SDK verilerinin aktarımında TLS kullandığını bildiriyor. Mağasa formundaki tüm veriler için şifreleme, isteğe bağlı toplama, silme ve bölüm başına amaçlar hakkında karar verirken diğer SDK'ları, açık kullanıcı paylaşımını ve reklam ortaklarını da değerlendirin. [Google SDK açıklaması](https://developers.google.com/admob/android/privacy/play-data-disclosure) · [Play formu](https://support.google.com/googleplay/android-developer/answer/10787469)

## Mağaza sahibinde kalan karşılaştırma

Önceki inceleme, mağaza tanıtımında tüm verilerin cihazda kaldığı yönünde bir ifadeyle veri güvenliği alanındaki konum ve uygulama etkinliği beyanını birlikte kaydetmişti. Uygulamadaki gizlilik politikası ve herkese açık veri güvenliği sayfası bu denetimde okunamadı. Güncel metin ve gönderilmiş Console formu henüz karşılaştırılmadı. Sayaç kayıtlarının cihazda tutulduğunu ve reklam SDK'sının işlediği bilgileri ayrı cümlelerle belirtin. Etkin reklam ortakları, kullanıcı denetimi, veri silme ve destek kanalı konusunda doğrulanmış metni aynı sürümle yayınlayın. [Uygulamada bağlı politika](https://sites.google.com/view/hedefzikirmatik/ana-sayfa) · [Google Play veri güvenliği sayfası](https://play.google.com/store/apps/datasafety?id=com.zikirhane.tesbih)
