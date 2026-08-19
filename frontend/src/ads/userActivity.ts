// Kullanıcı etkileşim izleyicisi — App Open reklamının çalışan ekranın
// üzerine binmesini engellemek için.
//
// SORUN (QA/inceleme bulgusu)
// ───────────────────────────
// Soğuk açılışta App Open reklamı hazır olur olmaz gösteriliyordu. Ancak
// reklamın yüklenmesi UMP onayı + SDK init + ağ isteği toplamı kadar
// sürdüğü için bu birkaç saniye alabiliyor. Bu sürede kullanıcı zaten:
//   uygulamayı açmış → ana sayfa render olmuş → ZİKİR ÇEKMEYE BAŞLAMIŞ
// olabiliyordu. Reklam tam o sırada ekranı kaplıyordu.
//
// Bu iki açıdan kötü:
//   1) Kullanıcı deneyimi: ibadet sırasında ekranı kaplayan reklam.
//   2) AdMob politikası: kullanıcı dokunma hâlindeyken açılan tam ekran
//      reklam KAZARA TIKLAMA üretir → "geçersiz trafik" riski.
//
// ÇÖZÜM
// ─────
// Kullanıcı uygulamayla etkileşime geçtiği anda bunu işaretliyoruz.
// `useAppOpenAd` soğuk açılış reklamını yalnızca kullanıcı HENÜZ hiçbir
// şeye dokunmamışken gösterir. Dokunulduysa o oturumun soğuk açılış
// reklamı iptal edilir (arka plandan dönüş reklamı etkilenmez).
//
// Modül seviyesinde basit bir bayrak; state değil, render tetiklemez.

let interacted = false;

/** Kullanıcı uygulamaya dokundu (sayaç, sekme vb.). */
export function markUserInteracted(): void {
  interacted = true;
}

/** Bu oturumda kullanıcı uygulamayla etkileşime geçti mi? */
export function hasUserInteracted(): boolean {
  return interacted;
}
