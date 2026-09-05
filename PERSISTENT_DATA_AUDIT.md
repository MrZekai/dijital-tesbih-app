# PERSISTENT_DATA_AUDIT.md

## Kalıcı anahtarlar

| Anahtar | Depo | Ne tutar | v1.1.0 |
|---|---|---|---|
| `zikirhane:v1` | AsyncStorage | TÜM uygulama durumu (JSON) | **Aynı anahtar, aynı `version: 1`** |
| `@zikirhane/app-open-last-shown-v1` | AsyncStorage | App Open son gösterim zamanı | Değişmedi |
| `zikirhane:lang:v1` | AsyncStorage | Seçili dil kodu | **YENİ** (bağımsız anahtar) |

SecureStore kullanılmıyor (uygulamada kimlik/token yok).

## Neden `version` hâlâ 1?

Play'deki 1028 şu kontrolü yapıyor: `if (parsed.version === 1)`.
Değeri 2'ye çıkarsaydık, kullanıcı herhangi bir nedenle eski sürüme
dönerse (sideload, cihaz yedeğinden geri yükleme) **tüm sayaçları
sıfırlanmış görürdü**. Bu yüzden diske yazılan `version` kalıcı olarak `1`
bırakıldı; kendi şema değişikliklerimiz **ayrı** bir alanda izleniyor:
`schemaRevision: 2`. Eski sürüm bu alanı tanımaz ama `{...parsed}` ile
kopyaladığı için silmez de. Sonuç: **ileri ve geri uyumluluk**.

## Şema (v1.1.0)

Korunan alanlar: `activeDhikrId`, `customDhikrs`, `dhikrStates`,
`totalCount`, `dailyLog`, `dhikrHistoryTotals`, `esmaCounters`,
`esmaFavorites`, `settings`, `tesbihatProgress`, `lastActionAt`.

Eklenen alanlar: `schemaRevision`, `favoriteDhikrIds`, `recentDhikrIds`,
`settings.confirmReset`; `settings.theme` artık `"system"` de olabilir.

## Migration kuralları (`src/lib/migration.ts`)

1. **Hiçbir sayaç, hedef veya geçmiş değeri azaltılmaz.**
2. Bilinmeyen ek alanlar `{...src}` ile **korunur**.
3. `dhikrHistoryTotals` yoksa `dailyLog` toplamı ile canlı sayaçların
   **MAKSİMUMU** alınır (toplama değil → çift sayım olmaz). 1.0.16'daki
   mantık birebir taşındı.
4. `recentDhikrIds` yoksa `dhikrStates[*].lastUsedAt` alanından geriye
   dönük inşa edilir — kullanıcı ilk açılışta boş liste görmez.
5. `confirmReset` yoksa **açık** kabul edilir (güvenli varsayılan).
6. `settings.theme` geçersizse `"dark"`a düşülür.
7. `activeDhikrId` silinmiş bir zikri işaret ediyorsa `subhanallah`a düşer.
8. Bozuk/tanınmayan JSON → `null` → uygulama varsayılan durumla açılır,
   **çökme yok**.

## Yazma güvenliği (korundu)

200 ms debounce + en fazla 1,5 sn zorunlu flush + arka plana geçerken
anında flush. Uzun dokunuş oturumlarında veri kaybı riski yok.

## Yedekleme (yeni)

`Ayarlar → Verileriniz → Yedek oluştur` tüm durumu JSON olarak önbelleğe
yazar ve sistem paylaşım sayfasını açar. Depolama izni gerekmez, hiçbir
veri sunucuya gitmez. Geri yükleme bu sürümde **yok** (bkz. sonraki adımlar).
