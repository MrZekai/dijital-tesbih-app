# Tam ekran reklam denetimi

Geçiş reklamları mevcut yapılandırmada kapalı. Banner ayrı bir yerleşim. Soğuk başlangıçta App Open yalnız içerik hazır olana, ilk etkileşime veya zaman aşımına kadar gösterilebilir. Önceki kodda uygulama arka plandan dönünce hazır bir reklam, bekleme süresi dolmuşsa sayaca veya tesbihata dönüşte de gösterilebiliyordu.

Bu sürümde ana sayaç ve tesbihat rotalarında dönüş reklamı engellenir. Kontrol hem yükleme perdesinden önce hem de gecikmeli gösterim anında yapılır. Diğer rotaların bekleme ve onay kuralları korunur. Otomatik kanca testi hazır içerik, onay, etkileşim, süre ve korunan rotaya dönüş koşullarını çalıştırır. Cihazda UMP ve reklam doluluğuyla doğrulama ayrıca gerekir.
