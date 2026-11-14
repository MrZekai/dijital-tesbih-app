# Zikirmatik web sitesi ve ücretsiz hosting

Bu klasör React Native uygulamasından bağımsız, bağımlılık gerektirmeyen statik site üretir. Türkçe, İngilizce ve Arapça için gerçek HTML içerik, çalışan web sayacı, kullanım rehberi, karşılıklı hreflang, ayrı canonical, sitemap, robots ve JSON-LD içerir. Arapça sayfalar RTL'dir. Android ve web kayıtları eşitlenmez.

## PowerShell ile önizleme

Node.js 22 veya daha yenisi kurulu olmalıdır. Depo kökünde:

```powershell
.\scripts\Publish-FreeHosting.ps1 -PreviewOnly
```

`http://localhost:4173/tr/` açılır; sunucuyu Ctrl+C ile durdurun. Önizleme çıktısı noindex'tir. Betik çalıştırma ilkeniz dosyayı engellerse yalnız indirdiğiniz dosyayı inceledikten sonra `Unblock-File -LiteralPath .\scripts\Publish-FreeHosting.ps1` kullanın; sistem genelinde güvenlik ilkesini kapatmanız gerekmez. Kurumsal bir ilke varsa yöneticinizin kurallarını izleyin.

## Firebase Hosting — önerilen ücretsiz yayın

Hosting için Spark yeterlidir; App Hosting, veritabanı, Cloud Functions veya faturalandırma hesabı gerekmiyor. Firebase'in ücretsiz `PROJE-KIMLIGI.web.app` alt alan adı kullanılır. Bu, satın alınmış bağımsız bir domain değildir. Alan adını sonra bağlayabilirsiniz.

Google hesabınıza tarayıcıda kendiniz giriş yapın. Şifre veya erişim anahtarını betiğe/sohbete yazmayın. Yeni projenin kimliği global olarak benzersiz, küçük harf ve tire içeren 6–30 karakter olmalıdır. Aşağıdaki örneği kendi seçiminizle değiştirin:

```powershell
.\scripts\Publish-FreeHosting.ps1 -ProjectId 'zikirmatik-size-ozel' -CreateProject -Login
```

Mevcut Firebase projesinde `-CreateProject` kullanmayın:

```powershell
.\scripts\Publish-FreeHosting.ps1 -ProjectId 'zikirmatik-mrzekai' -Login
```

Sonraki yayınlarda yalnız `-ProjectId` yeterlidir. Betik CLI 15.36.0'ı npx üzerinden kullanır, projeye erişimi doğrular, gerekirse Hosting sitesini açar, gerçek yayın adresiyle üretim dosyalarını oluşturur, testleri çalıştırır ve yalnız Hosting'i yayımlar. Hiçbir faturalandırma hesabı bağlamaz. Mevcut projeniz zaten Blaze planındaysa bu betik planı değiştirmez; ücretsiz kullanım isteğiniz için Console'da Spark durumunu kontrol edin.

Firebase CLI hesabınız proje oluşturma veya Hosting API etkinleştirme iznine sahip değilse betik durur; erişim sorununu Firebase Console'dan çözün. Komutun başarıyla çalışması, gerçek Google hesabı ve proje erişimi gerektirir. Canlı proje kimliği `zikirmatik-mrzekai`. [Yayımlanan site](https://zikirmatik-mrzekai.web.app/tr/)

13 Kasım 2026 itibarıyla Hosting ücretsiz sınırları: 10 GB depolama ve ayda 10 GB aktarım. Spark'ta aktarım sınırı aşılırsa kısa ek süreden sonra site sonraki aya kadar durabilir; otomatik ücretli plan açılmaz. Güncel kaynak: https://firebase.google.com/docs/hosting/usage-quotas-pricing

## Google Search Console

1. Yayındaki `https://PROJE.web.app/` adresini URL prefix mülkü olarak ekleyin.
2. HTML etiketi doğrulamasındaki yalnız kod değerini alın; HTML etiketinin tamamını değil.
3. Yeniden yayınlayın:

```powershell
.\scripts\Publish-FreeHosting.ps1 -ProjectId 'sizin-proje-kimliginiz' -VerificationCode 'GOOGLE-TARAFINDAN-VERILEN-KOD'
```

4. Search Console'da doğrulayın ve `https://PROJE.web.app/sitemap.xml` gönderin.
5. `/tr/`, `/en/`, `/ar/` sayfalarını URL denetimiyle kontrol edin. Sıralama/indexleme anında veya garantili değildir.

## GitHub Pages alternatifi

`website-pages.yml` manuel iş akışı, GitHub Pages ayarı **GitHub Actions** olarak seçildikten sonra aynı siteyi yayınlayabilir. Canonical için tek bir ana host seçin. Firebase'i ana site yaptıysanız Pages kopyasını ayrıca indekslenebilir olarak yayımlamayın.

`/tr/`, `/en/`, `/ar/` yolları çok dilli SEO için kasıtlıdır. Her dilin canonical'ı kendisidir; tüm dilleri İngilizceye canonical yapmak yanlış olur. Gerçek sayfa bulunmadığında 404 dönülür; bütün adresleri ana sayfaya yönlendiren SPA rewrite kullanılmaz.

## Özel alan adına geçiş

Alan adı Firebase'e bağlandıktan sonra `SITE_URL` değişkenini gerçek HTTPS adresine ayarlayıp `node site/build.mjs --production` çalıştırın. Ardından `node site/test.mjs` ve Firebase Hosting deploy. `Publish-FreeHosting.ps1` varsayılan `web.app` adresini kullanır; özel alan adı yayınında bu elle akışı kullanın. Eski URL'lerden yeni domaine 301 yönlendirme ve Search Console taşıma kontrollerini ayrıca planlayın.

## İçerik ve ölçüm

`content.mjs` tüm dil içeriğini barındırır. Anahtar kelime doldurma, sahte değerlendirme/yıldız veya desteklenmeyen özellik iddiası yoktur. SoftwareApplication işaretlemesi gerçek uygulamayı tanımlar; doğrulanmış rating/review olmadığından Google uygulama zengin sonucu uygunluğu iddia edilmez. Arapça metinlerin yayından önce ana dili konuşan biri tarafından gözden geçirilmesi önerilir.

Web sayacı ilk HTML geldikten sonra küçük bir JS dosyasıyla çalışır. Depolama bozuksa mevcut kayıt üzerine yazılmaz. Depolama reddinde kullanıcı uyarılır. Başka sekme kaydı değiştirirse sessizce üzerine yazmak yerine yeniden yükleme istenir. Reklam ve analiz SDK'sı bu web sitesine eklenmedi; Android reklamları korunur.

Kaynaklar: https://developers.google.com/search/docs/specialty/international/localized-versions · https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics · https://developers.google.com/search/docs/appearance/structured-data/software-app
