# CURRENT_FEATURE_INVENTORY.md

Sol sütun 1.0.21 (Play 1028) durumu, sağ sütun v1.1.0 sonrası.

| Alan | 1.0.21 | v1.1.0 |
|---|---|---|
| Navigasyon | expo-router, 4 sekme + 4 modal rota | aynı (bozulmadı) |
| Ana sayaç | Tam ekran dokunma, çoklu parmak (`Gesture.Manual`) | aynı + locale rakamları, RTL, erişilebilirlik etiketleri |
| Hedefler | 33 / 99 / 100 / 500 | + **1000** |
| Hazır zikirler | 6 adet, sabit Türkçe ad | 6 adet, **çeviri anahtarlı ad + kısa anlam**; `id` değişmedi |
| Özel zikir | Ekle/düzenle/sil, isim çakışma uyarısı | aynı + locale duyarlı normalizasyon, Arapça alanı RTL |
| Favoriler | ❌ (yalnız Esma'da vardı) | ✅ zikirlerde favori + üstte gruplama |
| Arama/filtre | ❌ | ✅ ad + Arapça yazılışta arama, Tümü/Favoriler/Özel filtresi |
| Son kullanılanlar | ❌ | ✅ (eski `lastUsedAt` verisinden geriye dönük inşa edilir) |
| Tesbihat | 33+33+33, kaldığı yerden devam | aynı + i18n, adımlar tek kaynaktan türetiliyor |
| Esmaül Hüsna | 99 isim, arama, favori, sayaç | aynı + Arapça'da arama, EN anlam yedeği + "insan kontrolü" uyarısı |
| İstatistik | bugün/hafta/ay/toplam, en sık 3 zikir | + **seri (streak)**, `Intl` hafta günleri, locale sayılar |
| Seri (streak) | ❌ | ✅ güncel + en uzun, `dailyLog`dan türetilir (ek kalıcı alan yok) |
| Tema | koyu / açık | koyu / açık / **sistem**; açık temada kontrast düzeltildi |
| Büyük yazı | ✅ %22 | aynı |
| Sade mod | ✅ | aynı |
| Ses / titreşim / ekran açık | ✅ | aynı |
| Yanlış sıfırlamaya karşı onay | Her zaman açık | ✅ **ayardan kapatılabilir** |
| Günlük hedef | 33/100/300/500/1000 + özel | aynı + Arapça-Hint/Farsça/Bengal rakam girişi kabul ediliyor |
| Hatırlatıcı | Günlük, sabit Türkçe metin | ✅ **seçili dilde**, dil değişiminde otomatik yeniden planlanır, saat locale biçiminde |
| Dışa aktarma / yedek | ❌ | ✅ JSON yedek + sistem paylaşımı (depolama izni gerekmez) |
| Dil | Yalnız Türkçe (sabit kodlu) | ✅ **27 dil**, cihazdan algılama + elle seçim + kalıcı tercih |
| RTL | ❌ (manifest `supportsRtl` açıktı ama arayüz LTR) | ✅ 7 RTL dili için yön-duyarlı yerleşim |
| Erişilebilirlik | Kısmi | ✅ sayaç/dokunma alanı/düğmeler için etiket, rol ve durum |
| Çevrimdışı | ✅ tamamen | aynı |
| Reklamlar | Banner + App Open, HER ortamda gerçek ID | ✅ aynı yerleşim, **dev/QA'da Google test ID'leri**, production'da gerçek ID |
| UMP / GDPR | fail-closed, gizlilik seçenekleri | aynı (dokunulmadı) |
| Gizlilik metni | Sabit Türkçe | ✅ 27 dilde |
