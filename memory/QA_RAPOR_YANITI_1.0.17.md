# QA Re-Test Report (Anshara) — Madde Madde Yanıt

**Rapor:** QA Re-Test Report — Hedef Zikirmatik v1.0.17
**Test cihazı:** vivo V2029 · Android 12 (API 31) · 720×1600
**Rapor tarihi:** 17-18 Ağustos 2026

> **Önemli bağlam:** Rapor, bizim bu oturumdaki düzeltmelerimizden ÖNCEKİ
> bir derlemeyi test etti. Rapordaki sürüm etiketi (1.0.17 / 1020) bizim
> seçtiğimiz numarayla çakışıyor ama bu FARKLI bir binary. Aşağıda her
> madde için "bizim pakette durum" ayrıca belirtildi.

---

## Özet tablo

| # | Rapordaki durum | Bizim paketteki durum |
|---|---|---|
| BUG-001 | Doğrulanamadı (yayın engeli) | **Kapatıldı** — çöken kod yolu artık uygulamada hiç oluşmuyor + kök hata sınırı |
| BUG-002 | Düzeltildi | Korunuyor |
| BUG-003 | Düzeltildi | Korunuyor |
| BUG-004 | Düzeltildi | Korunuyor |
| BUG-005 | Düzeltildi | Korunuyor |
| BUG-006 | Düzeltildi | Korunuyor |
| BUG-007 | Düzeltildi | Korunuyor + Büyük Yazı Modu artık tüm uygulamada çalışıyor |
| BUG-008 | Düzeltildi | Korunuyor |
| BUG-009 | Düzeltildi (reklam UI'dan kaldırılmıştı) | Reklam **geri açıldı** — yeni yerleşimle z-order riski yok, cihazda doğrulanmalı |
| BUG-010 | Düzeltildi | Korunuyor + NEW-001 ile birlikte yeniden yazıldı |
| BUG-011 | Düzeltildi | Korunuyor |
| BUG-012 | Düzeltildi | Korunuyor (1.0.17 / 1020) |
| BUG-013 | **Kısmen** — Zikirlerim + Ayarlar hâlâ hatalı | **Tamamlandı** — perde (scrim) yöntemiyle |
| BUG-014 | **Kısmen** — hata mesajı yok | **Tamamlandı** — mesaj + klavye kapanması |
| BUG-015 | Düzeltildi | Korunuyor |
| BUG-016 | Düzeltildi | Korunuyor |
| POSS-001 | Kapandı | — |
| **NEW-001** | **Yeni, yayın öncesi düzeltilmeli** | **Düzeltildi** — ref tabanlı, regresyon testi eklendi |
| UX-1 | Ele alınmadı | **Eklendi** |
| UX-2 | Ele alınmadı | **Eklendi** |
| UX-3 | Ele alınmadı | **Eklendi** |
| UX (klavye) | Yeni gözlem | **Düzeltildi** |
| UX (alt inset) | Yeni gözlem | **Düzeltildi** |

---

## NEW-001 — Namaz modu dokunuşları yanlış zikre yazıyor

**Rapordaki ölçüm:** 35 hızlı dokunuş → Sübhanallah **+35** / Elhamdülillah
**+0** (beklenen +33 / +2). 70 dokunuş → +43 / +36 / +1.
Toplamlar doğru, **dağılım** bozuk. Yani BUG-004'te yeni onarılan
"En Sık Yapılan Zikirler" sıralaması sessizce yeniden bozuluyordu.

**Teşhis (raporunki ile aynı):** yarış koşulu. `onTap` içindeki `step` ve
`count` değerleri render closure'ından okunuyordu. Otomatik geçiş
yerleştikten sonra React yeniden render edip yeni closure üretene kadar
gelen dokunuşlar eski zikri görüyordu.

**Düzeltme (raporun önerdiği yöntem):** Otoriter `stepIdx` / `count`
değerleri artık **ref**'lerde tutuluyor ve dokunuş anında **senkron**
güncelleniyor. React state'i yalnızca ekranı çizmek için aynalanıyor.
Her dokunuş, commit anında gerçek aşamayı okuyor.

**Ek olarak — kendi soktuğumuz bir regresyon:** Bu oturumun önceki
adımında `setCount(prev => …)` fonksiyonel güncelleyicisini
`count + 1` closure okumasıyla değiştirmiştik. Bu, aynı karede gelen iki
dokunuşun aynı değeri okuyup **sayım kaybına** yol açardı. Ref tabanlı
çözüm bunu da giderdi.

**Kanıt:** `tests/qaNew001Attribution.test.js` — rapordaki üç senaryoyu
birebir simüle eder. Test, ESKİ mantığın rapordaki hatalı sayıları
(35/0) ürettiğini **kanıtlar**, sonra yeni mantığın 33/2 verdiğini
doğrular. Ayrıca 99 dokunuşta 33/33/33 dağılımı ve toplam korunumu
farklı render zamanlamalarında (`flushEvery` 1/2/3/5/8) test edilir.

---

## BUG-001 — Reklam işleyicisinde sonsuz güncelleme döngüsü

**Raporun itirazı yerinde:** Çökme yeniden üretilemedi ama kod yolu
ikilide duruyordu, dolayısıyla "düzeltildi" denemezdi. Rapor ayrıca
APK'da gömülü bir geçiş reklamı birimi buldu:
`ca-app-pub-1380972808968213/3102428176`.

**Yaptıklarımız:**

1. **Çöken kod yolu artık uygulamada HİÇ OLUŞMUYOR.** Çökme,
   kütüphanenin `useInterstitialAd()` hook'unun içindeki
   `_handleAdEvent` reducer'ından kaynaklanıyordu. Geçiş reklamı bu
   sürümde kapalı olduğu için hook artık **hiç çağrılmıyor**
   (`interstitialEnabled` modül sabiti `false` → dal her render'da aynı,
   hook sırası bozulmaz). Yani "gösterilmiyor" değil, "yok".
2. **Kök seviyede hata sınırı** eklendi
   (`src/components/AppErrorBoundary.tsx`, `app/_layout.tsx`).
   Raporun tam olarak istediği şey: reklam SDK'sı kaynaklı bir render
   hatası sayaç ekranını asla düşüremez; kullanıcı "Yeniden Dene"
   ekranı görür, verisi diskte durur.
3. Banner'ın kendi hata sınırı zaten vardı; artık hata durumunda alanı
   yok etmek yerine yer tutucuya düşüyor (düzen zıplamıyor).

**Bilmeniz gereken:** O geçiş reklamı birimi (`/3102428176`) sizin gerçek
biriminiz. Bu sürümde **bilerek kapalı** bıraktık, çünkü çökmenin
kaynağı tam olarak o kod yoluydu ve rapor canlı dolumla test
edilmediğini söylüyor. Yayından sonra istikrar teyit edilince
`adConfig.ts` içinde `interstitialUnitId` ve `interstitialEnabled`
değerlerini doldurup ayrı bir turda test edebilirsiniz.

---

## BUG-013 — Kaydırılan içerik durum çubuğunun altına giriyor

**Rapor:** İstatistikler düzelmiş; **Zikirlerim** ve **Ayarlar** hâlâ
hatalı ("Ekranı Açık Tut" doğrudan sistem saatiyle çakışıyor).

**Kök neden:** Güvenli alan boşluğu `contentContainerStyle` içine
veriliyordu (`paddingTop: insets.top`). Bu boşluk **içerikle birlikte
kayar** — ilk açılışta doğru görünür, kaydırınca içerik saatin altına
girer.

**Düzeltme:** İki katmanlı.
1. Ayarlar artık İstatistikler ile aynı deseni kullanıyor
   (`SafeAreaView edges={["top"]}` + sabit `paddingTop`).
2. Üç ekrana da **`StatusBarScrim`** eklendi: içeriğin üzerinde çizilen,
   durum çubuğu yüksekliğinde opak bir bant. Kaydırma ne olursa olsun
   hiçbir metin bu bandın altına sızamaz. Zemin rengiyle aynı olduğu
   için görsel olarak fark edilmez.

---

## BUG-014 — Geçersiz hedef değeri sessizce reddediliyor

Hata mesajı mekanizması kaynak kodda zaten vardı ama metni belirsizdi.
Raporun önerdiği metin uygulandı:
*"Hedef 1 veya daha büyük bir tam sayı olmalıdır."*

Raporun ayrıca bildirdiği **yeni gözlem** de düzeltildi: "Uygula"dan
sonra sayısal klavye açık kalıp alt gezinme çubuğunu kapatıyordu. Artık
hem geçerli hem geçersiz girişte `Keyboard.dismiss()` çağrılıyor. Aynı
düzeltme "Özel Zikir Ekle" ekranındaki hedef alanına da uygulandı.

---

## UX-1 — Hedefe ulaşınca hiçbir geri bildirim yok

Raporun "kalan en yüksek değerli UX iyileştirmesi" dediği madde.
Uygulamanın en anlamlı anı işaretsiz geçiyordu — sadece taneler altın
oluyordu.

**Eklendi:** Hedefe ulaşıldığında ekranda açık bir bildirim çıkıyor:
*"Hedefe ulaştınız — 33 Sübhanallah. Allah kabul etsin."*
Mevcut altın halka parlaması, başarı titreşimi ve hedef sesi korundu.

---

## UX-2 — Hedefi aşınca tur takibi yok

"50 / 33" gibi anlamsız bir oran görünüyordu ve halka sürekli dolu
kalıyordu.

**Eklendi:** Tamamlanan tur sayısı bir rozet olarak gösteriliyor
("2 tur") ve tesbih halkası her yeni turda baştan doluyor. Tam katlarda
(33/33, 66/33) halka 0'a düşmeyip **dolu** kalıyor — sayaç davranışı
değişmedi, sadece görselleştirme anlamlı hale geldi.

---

## UX-3 — Tesbihat kaldığı yerden devam etmiyor

Kullanıcı 60. zikirde çıkıp geri geldiğinde baştan başlıyordu.

**Eklendi:** Tesbihat ilerlemesi (aşama + sayaç) kalıcı olarak saklanıyor
ve ekran açıldığında kaldığı yerden devam ediyor. Üstte
*"Kaldığınız yerden devam ediyorsunuz"* bilgisi ve yanında
**"Baştan başla"** seçeneği var. 12 saatten eski ilerleme dikkate
alınmıyor (ertesi gün namaza sıfırdan başlanır). Tesbihat tamamlanınca
kayıt temizleniyor.

---

## Raporda "test edilmedi" denen alanlar

| Alan | Durum |
|---|---|
| **Canlı reklam dolumu** | Raporun en önemli boşluğu. Reklamlar artık gerçek kimliklerle AÇIK — bu tur mutlaka test edilmeli. |
| Sesli çıktı | Kod tarafında doğru; cihazda kulakla doğrulanmalı. Tesbihat ekranına da ses eklendi (eskiden hiç yoktu). |
| Açık tema | Test edilmedi; yeni eklenen rozet/perde/bilgi baloncuğu açık temada da kontrol edilmeli. |
| Günlük hatırlatıcı | Bildirim başlığı "Zikirhane" → "Hedef Zikirmatik" olarak düzeltildi. Android 13+ izin akışı hâlâ test edilmedi. |
| Diğer cihazlar | Tek cihazda test edildi. |
| Türkçe klavye girişi | ADB ile test edilemedi; manuel doğrulama gerekiyor. |

---

## Bu turda tekrar test edilmesi gerekenler

Yeni değişiklikler yeni yüzeyler açtı; QA'ye şunları isteyin:

1. **Canlı reklamla dayanıklılık.** 900+ sürekli dokunuş, banner ekranda
   dolu haldeyken. Sayaç kaybı ve çökme kontrolü. (BUG-001'in gerçek
   sınavı.)
2. **Açılış reklamı.** Soğuk açılışta çıkıyor mu; arka plandan dönüşte 4
   dakika kuralına uyuyor mu.
3. **Banner yerleşimi.** Dört sekmede de sekme çubuğunun üstünde,
   kaydırmadan bağımsız görünüyor mu. Modal (Zikir Seç / Hedef Seç)
   açıldığında banner üste taşmıyor mu (BUG-009'un z-order uyarısı).
4. **NEW-001 tekrarı.** Rapordaki üç senaryo birebir: 5 / 35 / 70 hızlı
   dokunuş, per-dhikr sayaç kontrolü.
5. **Büyük Yazı Modu.** Artık tüm ekranları etkiliyor — taşma/kırpılma
   kontrolü, özellikle 720×1600 küçük ekranda.
6. **Tesbihat devam.** Ortada çık, geri gel, kaldığı yerden devam ediyor
   mu; "Baştan başla" çalışıyor mu.
7. **Durum çubuğu.** Zikirlerim ve Ayarlar'ı sonuna kadar kaydırıp saatle
   çakışma kontrolü.
