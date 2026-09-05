# GLOBAL_EXPANSION_PLAN.md

## Uygulanan mimari

```
frontend/src/i18n/
├── languages.ts      27 dilin tek kaynağı (kod, BCP-47, yerel ad, RTL)
├── plural.ts         CLDR çoğul kategorileri (Intl + elle yazılmış yedek)
├── format.ts         sayı / sayaç / hafta günü / tarih / saat / arama normalizasyonu
├── index.tsx         I18nProvider, useI18n(), useT(), tStatic(), dil algılama
└── locales/
    ├── en.ts         ANA KAYNAK — TranslationKey tipi buradan türer
    ├── index.ts      statik kayıt (dinamik import yok → Metro güvenli)
    └── <26 dil>.ts   Partial tablo; eksik anahtar → İngilizceye düşer
```

**Yeni dil eklemek:** `languages.ts`e bir satır + `locales/<kod>.ts` +
`locales/index.ts` kaydı. Başka hiçbir yer değişmez; testler eksik
anahtarları anında yakalar.

## Kararlar ve gerekçeleri

| Karar | Gerekçe |
|---|---|
| Düz (flat) nokta-ayrımlı anahtarlar | Anahtar eşitliği testi ve TypeScript tipi basit ve tam olur |
| `Partial` tablo + İngilizce yedek | Eksik çeviri **asla çökme üretmez** (talimat md. 6) |
| Cümle birleştirme YOK | Her tam cümle kendi anahtarında; dil bilgisi kuralları korunur |
| Sayı/tarih `Intl` ile | Arapça-Hint rakamları, binlik ayırıcı, hafta günü otomatik |
| Ana sayaçta ayırıcısız biçim | 4-5 haneli sayılarda taşma olmasın |
| RTL için kendi `Direction` katmanı | `I18nManager.forceRTL` yeniden başlatma ister; kullanıcı o ana kadar bozuk ekran görmemeli |
| Dil ayrı anahtarda (`zikirhane:lang:v1`) | Mevcut `zikirhane:v1` verisine hiç dokunulmaz |
| Zikir adları `nameKey` ile | `id` değişmediği için eski sayaçlar birebir korunur |
| Esma anlamları yalnız TR+EN | Doğrulanmamış dinî çeviri üretmemek için (talimat md. 6) |

## Sonraki adımlar (isteğe bağlı)

1. Android launcher adının dil bazlı yerelleştirilmesi
   (`res/values-tr/strings.xml` üreten bir config plugin).
2. Play Store listing yerelleştirmeleri (27 dil için başlık/açıklama).
3. Esma anlamlarının kalan 25 dilde insan çevirisi.
4. Yedekten **geri yükleme** (şu an yalnızca dışa aktarma var).
