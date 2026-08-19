# RELEASE 1.0.21 — Policy-aligned AdMob App Open

## Amaç

v1.0.20 gerçek cihaz testinde background -> foreground dönüşündeki App Open
creative'inin kapatma deneyimi tutarsız gözlendi. v1.0.21 reklam sistemini Google
AdMob'un App Open yerleşim mantığına göre yeniden sınırlar; reklamı tamamen tek
seferlik hale getirmez.

## Final reklam modeli

1. App Open yalnız root seviyesinde yönetilir.
2. Cold start reklamı yalnız splash/loading kapısı açıkken gösterilebilir.
3. Uygulamaya geri dönüşte App Open ancak kullanıcı en az 60 saniye uzakta
   kaldıysa değerlendirilir.
4. Tam ekran App Open gösterimleri arasında kod seviyesinde en az 15 dakika
   bulunur; son gösterim zamanı AsyncStorage ile processler arasında korunur.
5. Resume anında reklam önceden hazır değilse sonradan kullanıcının üzerine
   düşmez; yalnız sonraki fırsat için preload edilir.
6. Resume reklamından önce root loading gate açılır; banner/içerik üzerine
   sürpriz tam ekran bindirme yapılmaz.
7. App Open cache ömrü 4 saat ile sınırlıdır.
8. Banner sekmelerde tek görünür slot olarak korunur ve AdMob panelindeki
   automatic refresh ayarına göre oturum boyunca yenilenebilir.
9. Interstitial gerçek production unit ID bulunmadığı ve utility akışında
   doğal geçiş noktaları sınırlı olduğu için kapalı kalır.
10. UMP fail-closed ve mevcut Play Store manifest/privacy hardening korunur.

## AdMob panelinde zorunlu operasyon ayarları

- High-engagement ads: OFF (App Open kapatma seçeneği gecikmesini azaltmak için)
- App Open ad unit frequency cap: 3 impression / 1 hour (önerilen konservatif
  operasyon ayarı; Google tarafından zorunlu sabit sayı değildir)
- Banner automatic refresh: Google optimized

Bu AdMob panel ayarları kaynak koddan değiştirilemez; yayın öncesi hesapta ayrıca
kontrol edilmelidir.
