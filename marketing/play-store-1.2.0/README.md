# Zikirmatik 1.2.0 — Google Play metin paketi

Bu pakette **27 uygulama dili** için birer UTF-8 TXT ve Almanca mağaza kaydı için ek bir TXT bulunur. Her dosyada sırasıyla başlık, kısa açıklama ve uzun açıklama vardır; alanlar boş satırla ayrılır. `character-counts.csv` her alanın Unicode karakter sayısını ve sınırını gösterir.

## Kaynaklar ve yayın durumu

- TR, EN ve AR başlık/kısa açıklamalar kullanıcının 14 Kasım ASO kararlarından alınmıştır. Uzun açıklamalar doğrulanmış uygulama davranışına göre yeniden yazıldı.
- ID, MS, UR ve RU başlıkları kullanıcının kesin kararlarıdır. Kısa/uzun alanların dayanağı 14 Kasım kamu sayfası yanıtıdır; yanlış dokunma alanı, zorunlu titreşim ve tüm uygulamanın çevrimdışı olduğu izlenimi düzeltildi.
- DE mağaza kaydı korunur. Başlık aynı bırakıldı; kısa açıklama 80 karaktere indirildi ve uzun açıklamada Almanca arayüzün bulunmadığı açıkça belirtildi.
- Diğer 20 uygulama dili için başlık/kısa/uzun açıklama **taslakları** hazırlandı. Metinler uygulamanın kendi yerelleştirilmiş UI dizelerinden derlendi. Bu yöntem özellik doğruluğu için uygundur; mağaza dili, akıcılık ve arama terimleri açısından **ana dili konuşan insan denetimi gerektirir**.
- Kamu Play sayfası bazı istenen dillerde başka dil döndürmüştür. Bu yanıtlar hiçbir zaman o dilin metni diye kullanılmadı. Paket Play Console'a yüklenmedi ve mevcut mağaza kayıtlarını değiştirmedi.
- Gerçek Play Console mağaza alanları dışa aktarılıp bu taslaklarla karşılaştırılmalıdır. Özellikle kod/ülke eşleşmesi, bulunmayan kayıtların oluşturulması ve mevcut kaydın üzerine yazılacak alanlar doğrulanmalıdır.

## Kamu yanıtı dil denetimi

| Kodlar | 14 Kasım kamu yanıtı | Bu paketteki kaynak / sonraki işlem |
|---|---|---|
| tr, en, ar, id, ms, ur, ru | İstenen dilde | Kesin kararlar ve doğruluk düzeltmeleri; Console karşılaştırması |
| fa, bn, fr, az, kk, ky, sq, sw | İstenen dilde görünüyor | Korunmuş başlık/kısa + UI dizelerinden yeni uzun taslak; insan denetimi |
| uz, ps, bs, so, ha, dv | İngilizceye düştü | O dile ait UI dizelerinden taslak; Console dışa aktarımı gerekli |
| tg, tk | Rusçaya düştü | O dile ait UI dizelerinden taslak; Console dışa aktarımı gerekli |
| ku | Türkçeye düştü | Kurmanci UI dizelerinden taslak; Console dışa aktarımı gerekli |
| ckb | Arapçaya düştü | Soranice UI dizelerinden taslak; Console dışa aktarımı gerekli |
| fa-AF | Farsça yanıt, Dari kaydı belirsiz | Dari UI dizelerinden taslak; Console dışa aktarımı gerekli |
| pa-Arab | Şahmukhi yerine Gurmukhi döndü | Şahmukhi UI dizelerinden taslak; Console dışa aktarımı gerekli |
| de | Almanca metin | Mağaza kaydı korunur; Almanca arayüz yok |

Kamu sayfasının döndürdüğü metin, Play Console'da düzenlenebilir bir yerel kayıt bulunduğunu tek başına kanıtlamaz.

## Yayın kontrol listesi

- [ ] Yeni Android ekran görüntülerini gerçek 1.2.0 sürümünden al; ana sayaç, 33×3 tesbihat, Esmaül Hüsna, hedef ve istatistik ekranlarını göster. Görsel üstü yazıları diline göre yerelleştir.
- [ ] Geliştirici sitesi olarak `https://zikirmatik-mrzekai.web.app` adresini Play Console'da doğrula.
- [ ] Veri güvenliği formunu 1.2.0 kodu ve reklam SDK'sının işlediği verilerle karşılaştır; gizlilik politikası bağlantısını denetle.
- [ ] 27 dilin taslağını ana dili konuşan gözden geçirenlere kontrol ettir; özellikle sağdan sola yazılan dilleri ve dini terimleri denetle.
- [ ] Play Console mağaza kayıtlarını dışa aktar; dil kodlarını ve mevcut alanları paketle karşılaştır.
- [ ] Son QA APK'da metinlerin anlattığı özellikleri ve 1031 sürüm kodunu doğrula.
- [ ] Üretim AAB'sini yalnız proje sahibi hazırlayıp yayınlasın.

