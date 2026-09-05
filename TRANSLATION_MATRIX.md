# TRANSLATION_MATRIX.md

27 dil × **181 anahtar**. Kaynak: `frontend/src/i18n/locales/en.ts`.
Otomatik doğrulama: `frontend/tests/v110GlobalI18n.test.js` (`yarn test`).

| # | Dil | Kod | BCP-47 | RTL | Arayüz | Zikir adları | Esma anlamları |
|---|---|---|---|---|---|---|---|
| 1 | English | `en` | en | – | ✅ kaynak | ✅ | ✅ |
| 2 | Türkçe | `tr` | tr | – | ✅ | ✅ | ✅ (1.0.x'ten korundu) |
| 3 | العربية | `ar` | ar | ✅ | ✅ | ✅ | EN yedek |
| 4 | Bahasa Indonesia | `id` | id | – | ✅ | ✅ | EN yedek |
| 5 | Bahasa Melayu | `ms` | ms | – | ✅ | ✅ | EN yedek |
| 6 | اردو | `ur` | ur | ✅ | ✅ | ✅ | EN yedek |
| 7 | فارسی | `fa` | fa | ✅ | ✅ | ✅ | EN yedek |
| 8 | বাংলা | `bn` | bn | – | ✅ | ✅ | EN yedek |
| 9 | Français | `fr` | fr | – | ✅ | ✅ | EN yedek |
| 10 | Русский | `ru` | ru | – | ✅ | ✅ | EN yedek |
| 11 | Azərbaycan | `az` | az | – | ✅ | ✅ | EN yedek |
| 12 | O‘zbek | `uz` | uz | – | ✅ | ✅ | EN yedek |
| 13 | Қазақша | `kk` | kk | – | ✅ | ✅ | EN yedek |
| 14 | Кыргызча | `ky` | ky | – | ✅ | ✅ | EN yedek |
| 15 | Тоҷикӣ | `tg` | tg | – | ✅ | ✅ | EN yedek |
| 16 | Türkmençe | `tk` | tk | – | ✅ | ✅ | EN yedek |
| 17 | پښتو | `ps` | ps | ✅ | ✅ | ✅ | EN yedek |
| 18 | Shqip | `sq` | sq | – | ✅ | ✅ | EN yedek |
| 19 | Bosanski | `bs` | bs | – | ✅ | ✅ | EN yedek |
| 20 | Soomaali | `so` | so | – | ✅ | ✅ | EN yedek |
| 21 | Hausa | `ha` | ha | – | ✅ | ✅ | EN yedek |
| 22 | Kiswahili | `sw` | sw | – | ✅ | ✅ | EN yedek |
| 23 | Kurdî (Kurmanji) | `ku` | ku | – | ✅ | ✅ | EN yedek |
| 24 | کوردی (Sorani) | `ckb` | ckb-IQ | ✅ | ✅ | ✅ | EN yedek |
| 25 | ދިވެހި | `dv` | dv | ✅ | ✅ | ✅ | EN yedek |
| 26 | دری (Dari) | `fa-AF` | fa-AF | ✅ | ✅ | ✅ | EN yedek |
| 27 | پنجابی (Shahmukhi) | `pa-Arab` | pa-Arab-PK | ✅ | ✅ | ✅ | EN yedek |

## Çoğul biçimleri

CLDR kategorileri desteklenir. Arapça 6 (`zero/one/two/few/many/other`),
Rusça 4, Boşnakça 3, Fransızca 3, diğerleri `one/other`; Endonezce/Malayca
tek biçim. Çalışma zamanında `Intl.PluralRules`, ICU yoksa elle yazılmış
yedek kurallar kullanılır (`src/i18n/plural.ts`).

## `NEEDS_HUMAN_REVIEW` — insan kontrolü gereken dinî içerik

Aşağıdakiler **uydurulmadı**; ya birebir korundu ya da ölçülü İngilizceye
çevrildi. Bir din görevlisi / anadil konuşuru kontrolü önerilir:

1. **Esmaül Hüsna anlamları (99 × 25 dil)** — Türkçe ve İngilizce dışındaki
   25 dilde çeviri YAPILMADI. Uygulama İngilizce anlamı gösterir ve
   `esma.meaning_pending` uyarısını ekrana yazar. Doğrulanmamış dinî çeviri
   üretmek yerine bilinçli olarak boş bırakıldı.
   → Dosya: `frontend/src/lib/esma.ts` (`meaningEn` alanı)
2. **Esmaül Hüsna İngilizce anlamları (99 madde)** — bu çalışmada yazıldı,
   kısa ve genel kabul gören ifadelerdir; fıkhî hüküm içermez.
   **İnsan kontrolü önerilir.**
3. **6 hazır zikrin anlamları (27 dil)** — "Subhanallah = Glory be to Allah"
   gibi standart, tartışmasız ifadeler. Yine de anadil kontrolü önerilir.
4. **Zikir okunuşları (transliterasyon)** — her dilin kendi yazı sistemine
   uyarlandı (Kiril, Arap, Bengal, Thaana). Bölgesel telaffuz farkları için
   anadil kontrolü önerilir.
5. **`tesbihat.subtitle`** — "33 × Subhanallah · 33 × Elhamdülillah ·
   33 × Allahu Ekber". Her dile o dilin okunuşuyla yazıldı.

**Ayet, hadis, dua metni veya kaynak referansı EKLENMEDİ.** Uygulamada
doğrulanmamış hiçbir dinî metin bulunmuyor.
