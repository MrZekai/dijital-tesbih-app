# Zikirmatik 1.2.0 — Google Play metin paketi

Her UTF-8 TXT dosyasında sırasıyla **başlık**, **kısa açıklama**, **uzun açıklama** bulunur. Alanlar arasında boş satır vardır; bu açıklama dosyasını Play Console'a yapıştırmayın.

## Kaynak ve sınır

- TR, EN ve AR başlık/kısa açıklamalar: kullanıcının 14 Kasım ASO kararları. Uzun açıklamalar özellik envanterine göre düzeltildi.
- ID, MS, UR ve RU başlıkları: kullanıcının kesin kararları. Diğer alanlar 14 Kasım kamu sayfası yanıtından alındı; yanlış dokunma alanı, zorunlu titreşim ve tüm uygulamanın çevrimdışı olduğu izlenimi düzeltildi.
- DE kaydı korundu. Mevcut kamu başlığı aynı kaldı; kısa açıklama karakter sınırına indirildi ve uzun açıklamada Almanca arayüzün bulunmadığı açıkça belirtildi.
- Bunlar **yayın taslaklarıdır**. Play Console'daki mevcut alanları, yerelleştirme kodlarını ve Veri güvenliği formunu dışa aktararak son kez karşılaştırın.
- `character-counts.csv` başlık/kısa/uzun alanların Unicode karakter sayılarını verir. Sekiz dilin tümü 30/80/4000 sınırları içindedir.

## Dil denetimi

| Dil kodu | Kamu yanıtı | Teslim / sonraki işlem |
|---|---|---|
| tr | Türkçe | `tr.txt` |
| en | İngilizce | `en.txt` |
| ar | Arapça | `ar.txt` |
| id | Endonezce | `id.txt` |
| ms | Malayca | `ms.txt` |
| ur | Urduca | `ur.txt` |
| ru | Rusça | `ru.txt` |
| de | Almanca metin | `de.txt`; Almanca arayüz yok |
| fa, bn, fr, az, kk, ky, sq, sw | İstenen dilde metin görünüyor | Mevcut kaydı koru; Play Console dışa aktarımı gerekli |
| uz, ps, bs, so, ha, dv | İngilizce döndü | Play Console dışa aktarımı gerekli |
| tg, tk | Rusça döndü | Play Console dışa aktarımı gerekli |
| ku | Türkçe döndü | Play Console dışa aktarımı gerekli |
| ckb | Arapça döndü | Play Console dışa aktarımı gerekli |
| fa-AF | Farsça yanıt, Dari kaydı belirsiz | Play Console dışa aktarımı gerekli |
| pa-Arab | Şahmukhi yerine Gurmukhi metin döndü | Play Console dışa aktarımı gerekli |

Kamu sayfasının döndürdüğü metin, Play Console'da düzenlenebilir bir yerel kayıt bulunduğunu tek başına kanıtlamaz. Bu nedenle belirsiz diller için TXT hazırlanmadı.

## Yayın kontrol listesi

- [ ] Son QA APK'da özellikleri ve yeni metinlerle uyumu doğrula; özellikle paylaşım kartı ve değerlendirme akışı tamamlanınca açıklamayı tekrar kontrol et.
- [ ] Yeni Android ekran görüntülerini gerçek 1.2.0 sürümünden al; ana sayaç, 33×3 tesbihat, Esmaül Hüsna, hedef ve istatistik ekranlarını göster. Görsel üstü yazıları diline göre yerelleştir.
- [ ] Geliştirici sitesi olarak `https://zikirmatik-mrzekai.web.app` adresini ve uygulama bağlantılarını Play Console'da doğrula.
- [ ] Veri güvenliği formunu 1.2.0 kodu ve reklam SDK'sının işlediği verilerle karşılaştır; gizlilik politikası bağlantısını denetle.
- [ ] Yukarıdaki belirsiz diller için Play Console mağaza kaydı dışa aktarımını al; yanlış dildeki kamu yanıtını yerel metin diye yapıştırma.
- [ ] En yüksek kullanılmış sürüm kodunu ve 1031'in uygunluğunu Play Console'da doğrula.
- [ ] Üretim AAB'sini yalnız proje sahibinin hazırlayıp yayınlamasını bekle.

