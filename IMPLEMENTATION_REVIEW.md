# Odak, güvenli kayıt ve ücretsiz web yayını

14 Kasım 2026. Başlangıç commit'i: `4e09f6c968e3c7b92f5b02c90e480d46894727fc`.

## Web ve hosting

- Türkçe, İngilizce ve Arapça 7 statik sayfa; çalışan çevrimiçi sayaç ve kullanım rehberleri.
- Ayrı canonical, karşılıklı hreflang, sitemap, robots, Open Graph, JSON-LD; Arapça RTL. Önizleme noindex, üretim gerçek HTTPS adresi gerektirir.
- Firebase Hosting Spark için PowerShell kurulumu: `scripts/Publish-FreeHosting.ps1`. Proje kimliği `zikirmatik-mrzekai`. [Canlı site](https://zikirmatik-mrzekai.web.app/tr/).
- GitHub Pages için isteğe bağlı manuel iş akışı. Ana SEO adresi için bir hosting seçilmelidir.
- Web sayacı Android kaydından bağımsızdır. Hesap/senkronizasyon ya da desteklenmeyen ses tuşu özelliği vaat edilmez.

## Android kodu

- İlk kayıt okunmadan sayım kabul edilmez. Okuma hatasında mevcut verinin üzerine boş kayıt yazılmaz; kullanıcı yeniden deneyebilir.
- Disk yazmaları sıraya alınır; en yeni bekleyen durum saklanır. Yazma hatası ve tekrar deneme görünürdür. Eski kayıt biçimi korunur; geçersiz sayılar doğrulanır.
- Tesbihatta 33 ve 66 sonrası sıfır sayılı yeni aşamadan devam düzeltildi.
- Sayaçta dekoratif katmanlar azaltıldı; Odak renkleri ve sade sayaç kullanıldı. Sayı biçimleyici önbelleği, tercih bağlamı ve görünmeyen sekmeleri dondurma ile tekrar hesaplama/render yükü azaltıldı.
- Hazır içerik açılış reklamını beklemez. Süre sınırından veya kullanıcı etkileşiminden sonra gelen reklam içeriğin üzerine açılmaz. Ön yükleme, onay ve sıklık kontrolleri korunur.
- Adaptif banner gerçek SDK yüksekliğine göre alan ayırır; sabit yükseklikle kırpma kaldırılır.

## Doğrulama

- TypeScript kontrolü başarılı; ESLint 0 hata, önceden bulunan 2 kullanılmayan değişken uyarısı.
- 12 uygulama test dosyası; gerçek hook üzerinde açılış reklamı/geç yüklenme/izin senaryoları, gerçek store üzerinde hızlı sayım, disk hata ve sıra kontrolleri.
- Web testleri: 7 rota, dil/canonical/sitemap/bağlantı/JSON-LD/404, sayaç, geri al, kayıt hatası ve sekmeler arası çakışma. Hem kök adres hem GitHub alt dizini test edildi.
- PowerShell yayın akışı, gerçek build ve sahte CLI ile 5 senaryoda test edildi. Test sırasında bulut kaynağı oluşturulmaz.
- Expo web üretim export'u başarılı. Bu sonuç Android açılış süresi veya kare hızı ölçümü değildir.

## Yayından önce kalan kontroller

Firebase yayını ve web sayacının üç dilde açılması doğrulandı. Android cihazda açılış, hızlı sayım, arka plan/geri dönüş, UMP ve farklı banner boyutları test edilmeli; imzalı AAB oluşturulmadı. Mobil sürümün cihaz üzerindeki görsel ve performans kontrolleri Play yayını öncesinde yapılmalıdır.

Yeni kayıt hata mesajları için ckb ve dv dillerinde İngilizce yedek metin bulunur; ana dil incelemesi gerekir. Diğer çeviriler ve Arapça site metinleri de dil incelemesinden geçirilmelidir.

Gelir artışı, Google Play politika onayı ve arama sıralaması garanti edilmez. Reklam birimleri korunur; gelir etkisi Play/AdMob gerçek verileriyle izlenmelidir. Anahtar kelime hacmi ölçülmedi; Gemini'nin hacim iddiaları doğrulanmış veri olarak kullanılmadı.

Kurulum: [site/README.md](site/README.md).
