# Zikirmatik: Türkiye Google Play mağaza girişi

Hazırlanma: 5 Kasım 2026. Kod doğrulaması: `frontend` yayın adayı 1.1.1 (versionCode 1030), paket `com.zikirhane.tesbih`. Yayımdaki 1.1.0 derlemesinin bu depodaki önceki commit ile aynı olduğu Play Console'dan ayrıca doğrulanmalı. Bu dosya yayımlanmış mağaza girişini kendiliğinden değiştirmez.

6 Kasım güncellemesi: 1030 adayında Android release derlemesi için R8 kod küçültme açıldı; Ayarlar > Uygulama bölümüne kullanıcı başlatmalı Play değerlendirme ve paylaşma bağlantıları eklendi. Bunlar mağazadaki puan veya indirme sayısının artacağını garanti etmez. Yeni AAB yüklenip Play analizi yenilenmeden DEX uyarısının kalktığı iddia edilmemeli.

## Önce düzeltilecek beyan

Türkçe uzun açıklamadaki “Hiçbir veri sunucuya gönderilmez” ve “uygulama tamamen çevrimdışı çalışır” cümlelerini kaldırın. Sayaç ve zikir kayıtları cihazda tutulsa da uygulama AdMob reklamları kullanıyor. Yayımlanan Veri güvenliği beyanında cihaz tanımlayıcıları, uygulama etkileşimleri, teşhis verileri ve yaklaşık konum için toplama/paylaşma gösteriliyor. İşlevin internetsiz çalışması ile reklam trafiğini ayrı anlatın. [Google Play mağaza girişi ilkeleri](https://support.google.com/googleplay/android-developer/answer/13393723?hl=tr) işlev ve veri iddialarının doğru olmasını ister.

Mevcut başlık **“Zikirmatik: Dijital Tesbih”** ilk aşamada kalsın. Hem ürün işlevini hem aranan iki yaygın terimi anlatıyor; yeni bir başlığın daha iyi olacağına dair arama hacmi veya dönüşüm verisi yok.

## Yayına hazır Türkçe metin

**Kısa açıklama, önerilen deney varyantı (77/80 karakter):**

```text
Namaz sonrası tesbihat, Esmaül Hüsna ve hedefli zikir sayacı. Hesap gerekmez.
```

**Uzun açıklama (4.000 karakter sınırının altında):**

```text
Zikirmatik, zikrini saymak, hedef koymak ve namaz sonrası tesbihatı takip etmek için sade bir dijital tesbih ve zikir sayacıdır. Ekrana dokunarak tek elle saymaya devam edebilirsin.

Zikir sayacı
• Ekranın geniş dokunma alanıyla kolay sayım
• Hızlı dokunuşlarda çoklu dokunma desteği
• İsteğe bağlı titreşim ve tesbih tanesi sesi
• Yanlış dokunuş için Geri Al
• Hedef aşıldığında tur takibi

Hedefini belirle
33, 99, 100, 500 ve 1000 hazır hedeflerinden birini seç veya kendi hedefini yaz. Hedefe ulaştığında görsel ve dokunsal bildirim al.

Namaz sonrası tesbihat
33 Sübhanallah, 33 Elhamdülillah ve 33 Allahu Ekber adımlarını sırayla takip et. Her 33 sayımda sonraki adıma geç; yarıda bıraktığın tesbihata daha sonra devam et.

Esmaül Hüsna
Allah'ın 99 ismini Arapça yazılışı, Türkçe okunuşu ve kısa Türkçe anlamıyla incele. İsimleri ara, favorilerine ekle ve her isim için ayrı sayaç kullan.

Kendi zikirlerin ve istatistikler
Kendi zikirlerini oluşturup hedef belirle. Günlük, haftalık ve aylık sayımlarını, günlük hedefini ve en sık yaptığın zikirleri izle. İstersen günlük hatırlatıcı ayarla.

Kullanım seçenekleri
Koyu ve açık tema, büyük yazı, sade kullanım ve ekranı açık tutma seçeneklerini ihtiyacına göre ayarla. Arayüz 27 dili destekler. Esmaül Hüsna anlamları Türkçe ve İngilizce sunulur.

Gizlilik ve reklamlar
Hesap açman gerekmez. Zikir kayıtların, sayaç geçmişin ve ayarların cihazında saklanır; sayacı internet bağlantısı olmadan kullanabilirsin. Uygulama Google AdMob reklamlarıyla desteklenir. Reklam hizmeti, reklam sunumu, ölçüm ve güvenlik için cihaz ve uygulama kullanım verilerini işleyebilir. Ayrıntılar için Google Play Veri güvenliği bölümüne ve gizlilik politikasına bak. Uygulama içi satın alma veya abonelik yoktur.
```

Metinde **yedekten geri yükleme**, **27 dilde Esma anlamı**, **reklamsız çalışma** veya **bütün veriler çevrimdışı** vaat edilmez; kod bunları desteklemiyor. Hazır zikir hedefleri kodda 33, 99, 100, 500, 1000; “300” günlük hedef ayarıdır. Son yayın derlemesinde bu değerleri cihazda kontrol edin.

## Ekran görüntüleri

Gerçek Android yayın derlemesinden, Türkçe arayüzle yeni görüntüler alın. Görsellerde uygulamanın sunduğu ekranlar yer almalı; hayalî arayüz veya kullanıcı yorumu kullanılmamalı. İlk üç görsel birbirinden ayrı ana işlevi göstermeli:

| Sıra | Görseldeki kısa başlık | Gerçek ekran |
| --- | --- | --- |
| 1 | Ekrana dokun, zikrini say | Ana sayaç ve hedef halkası |
| 2 | Namaz sonrası 33×3 tesbihat | Tesbihat adımları ve mevcut sayım |
| 3 | Esmaül Hüsna'yı keşfet | İsim listesi ve Türkçe anlam |
| 4 | Hedef koy, turunu gör | Hedef tamamlanmış ana sayaç |
| 5 | İlerlemeni takip et | İstatistikler ve son yedi gün |
| 6 | Kullanımını kişiselleştir | Ayarlar, büyük yazı ve sade kullanım |

Mevcut 1 ve 2 aynı ana sayacı gösteriyor; mevcut 5'in Esma görüntüsü 3. sıraya alınabilir. Yeni 2. görsel için tesbihat ekranı çekilmeli. Metinli görselleri başka diller için kullanırken o dilde ayrıca hazırlayın. Boyut ve biçim şartları için [Google Play önizleme öğeleri](https://support.google.com/googleplay/android-developer/answer/9866151?hl=tr) sayfasını uygulayın. Feature graphic'in 1024×500 boyutunda yüklü olduğunu Play Console'da doğrulayın.

## Ölçüm ve deney

1. Önce gizlilik cümlesini düzeltin ve uzun açıklamayı yayımlayın. Başlık, simge ve kısa açıklamayı bu aşamada sabit tutun.
2. Play Console > Mağaza girişi denemeleri bölümünde **yalnızca Türkçe kısa açıklamayı** test edin. A: mevcut 79 karakterlik metin; B: yukarıdaki 77 karakterlik metin.
3. Hedef metrik olarak **benzersiz kullanıcı yükleme tıklamaları**nı seçin. Temmuz 2026'dan itibaren mağaza performansı tıklama odaklı raporlanıyor; Claude denetimindeki “1 gün elde tutulan yükleyenler” bu deneyin hedef metriklerinden biri değil. [Deney belgeleri](https://support.google.com/googleplay/android-developer/answer/12053285?hl=en) ve [mağaza performansı belgeleri](https://support.google.com/googleplay/android-developer/answer/9859173?hl=en) esas alınmalı.
4. Trafik azsa deney sonuç üretmeyebilir. Play Console'un tahmini süre ve güven aralığına bakın; sonuç yokken kazanan ilan etmeyin. Trafik kaynağına ve Türkiye/Türkçe kırılımına göre ziyaretçi, tıklama ve CTR değerlerini kaydedin.
5. Sonraki deneyde yalnızca ilk üç görselin sırasını ve tesbihat görselini değiştirin. Aynı deneyde başlık ve görselleri birlikte değiştirmeyin.

## Play Console kontrol listesi

- Yayındaki AAB'nin sürüm kodu, ekranlar ve reklam davranışı depodaki kodla aynı mı?
- Veri güvenliği formu ve gizlilik politikası AdMob SDK'nın güncel beyanlarıyla uyumlu mu?
- Android Vitals: çökme ve ANR oranları nedir? Önce buradaki ciddi sorunları çözün.
- Türkçe mağaza ziyareti, yükleme tıklaması ve CTR; arama ile keşfetme kırılımı nedir?
- Gerçek kullanıcı yorumlarına yanıt veriliyor mu? Puan isteme akışı ancak temel işlev sorunsuz çalıştıktan sonra ve kullanıcı deneyimini kesmeden tasarlanmalı; sahte veya teşvikli yorum kullanılmamalı.
- Uygulama web sitesi Türkçe mağaza adını ve Play bağlantısını açıkça gösteriyor mu?

Bu maddeler için Play Console erişimi veya gerçek cihaz gerekir; depo ve herkese açık mağaza sayfası tek başına doğrulama sağlamaz.

## 1030 için “Yenilikler” metni

```text
Zikirmatik'i daha akıcı ve güvenilir hale getirdik. Hızlı sayım ve hedef geri bildirimini iyileştirdik; yedek paylaşımındaki hatalı başarı mesajını düzelttik. Android derlemesinde kod optimizasyonunu açtık. Ayarlar'dan uygulamayı değerlendirebilir veya paylaşabilirsin.
```

Bu metin yalnızca 1030 AAB'si gerçekten yüklendikten sonra kullanılmalı. Yeni ekran görüntülerinde yalnızca pakette bulunan özellikler gösterilmeli.
