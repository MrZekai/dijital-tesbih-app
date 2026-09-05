# app-ads.txt Kurulumu

## Bu dosya uygulamanın İÇİNE konmaz

`app-ads.txt`, APK/AAB içine paketlenen bir dosya **değildir**. IAB Tech Lab
standardıdır ve **geliştirici web sitenin kök dizininde**, düz metin olarak
HTTPS üzerinden yayınlanır. AdMob, Google Play'deki uygulama kaydında yazan
"Geliştirici web sitesi" alan adını okur, oraya gider ve
`/app-ads.txt` dosyasını tarar.

Repodaki `app-ads.txt` dosyası **kaynak nüshadır** — web sitene yükleyeceğin
içeriktir. Build'e dâhil edilmez.

## İçerik

```
google.com, pub-1380972808968213, DIRECT, f08c47fec0942fa0
```

Bu satır: "google.com üzerinden `pub-1380972808968213` yayıncı kimliğine
DOĞRUDAN envanter satma yetkisi verilmiştir" demektir.
`f08c47fec0942fa0` Google'ın sabit sertifikasyon kimliğidir; değiştirme.

Bu yayıncı kimliği, uygulamadaki AdMob Application ID ile tutarlıdır:
`ca-app-pub-1380972808968213~2930057843` → yayıncı kısmı
`pub-1380972808968213`. ✅ Doğrulandı.

## Adım adım

1. **Play Console'daki geliştirici web sitesini kontrol et.**
   Play Console → Uygulama → Store presence → Main store listing →
   "Website" alanı. AdMob **tam olarak** bu alan adına bakar.
   - Yazan: `https://ornek.com` → aranan: `https://ornek.com/app-ads.txt`
   - Yazan: `https://www.ornek.com` → aranan: `https://www.ornek.com/app-ads.txt`
   - `www` var/yok farkı önemlidir. Her ikisinin de çalışmasını sağlamak en
     güvenlisidir (yönlendirme yeterli değil — AdMob en fazla bir kez 301/302
     takip eder, o yüzden ikisinde de gerçek dosya bulunsun).

2. **Dosyayı kök dizine koy.**
   `https://<alan-adin>/app-ads.txt` adresinden doğrudan erişilebilmeli.
   - `Content-Type: text/plain` olmalı.
   - HTTP 200 dönmeli (301/302 zinciri, 403, HTML hata sayfası olmaz).
   - Cloudflare / bot koruması bu yolu **engellememelidir**.

3. **Doğrula.**
   ```bash
   curl -sSL -D - https://<alan-adin>/app-ads.txt -o -
   ```
   Beklenen: `HTTP/2 200`, `content-type: text/plain`, gövdede tam olarak
   yukarıdaki satır.

4. **AdMob'un taramasını bekle.** En az 24 saat, bazen 48 saate kadar sürer.

5. **Durumu kontrol et.** AdMob → Uygulamalar → (uygulaman) → app-ads.txt
   sekmesi. "Bulundu / Yetkili" görmelisin.

## Eğer geliştirici web siten yoksa

app-ads.txt zorunlu değildir, ama **olmadığında bazı reklam alıcıları
envanterine teklif vermez** — bu doğrudan gelir kaybıdır. Bir alan adın yoksa
en ucuz çözümler:

- GitHub Pages (`kullaniciadi.github.io`) — ücretsiz, HTTPS dâhil.
  Ancak Play Console'daki web sitesi alanına da **aynı adresi** yazman gerekir.
- Netlify / Cloudflare Pages ücretsiz katmanı.
- Zaten sahip olduğun bir alan adının kökü.

Hangisini seçersen seç, kural aynı: **Play Console'daki adres = app-ads.txt'in
bulunduğu adres.**

## Sık yapılan hatalar

| Hata | Sonuç |
|---|---|
| Dosyayı `/public/app-ads.txt` gibi alt dizine koymak | Bulunamaz |
| Play Console'da web sitesi alanını boş bırakmak | AdMob nereye bakacağını bilemez |
| `www` uyuşmazlığı | Bulunamaz |
| Dosyayı HTML olarak sunmak (`text/html`) | Geçersiz sayılabilir |
| Satırı tırnak içine almak / virgülleri kaldırmak | Ayrıştırma hatası |
| Sonuna BOM veya CRLF karışması | Genelde tolere edilir, yine de LF tercih et |

## Bu depodaki durum

- `app-ads.txt` → kök dizinde, yayınlanacak nüsha.
- Uygulama derlemesine **dâhil edilmez** (frontend/assets altında değildir).
- `RELEASE_COMPATIBILITY_CHECKLIST.md` içindeki yayın öncesi listede
  "app-ads.txt yayında ve 200 dönüyor" maddesi olarak takip edilir.
